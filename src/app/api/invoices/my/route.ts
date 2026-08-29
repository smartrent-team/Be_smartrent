import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function GET() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'tenant') {
      return NextResponse.json({ error: 'API chỉ dành cho cư dân' }, { status: 403 })
    }

    const supabase = auth.supabase!

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, room_id')
      .eq('user_id', auth.dbUserId)
      .is('move_out_date', null)
      .maybeSingle()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ cư dân' }, { status: 404 })
    }

    const invoiceSelectWithPayment = `
        id,
        invoice_code,
        total_amount,
        payment_status,
        issued_at,
        due_date,
        created_at,
        room_price,
        service_cost,
        electric_cost,
        water_cost,
        electric_old,
        electric_new,
        water_old,
        water_new,
        qrPayload,
        checkoutUrl,
        payment_account_number,
        payment_account_name,
        payment_bank_bin,
        payment_description,
        rooms ( room_code, branch:branches ( name ) )
      `

    const invoiceSelectBase = `
        id,
        invoice_code,
        total_amount,
        payment_status,
        issued_at,
        due_date,
        created_at,
        room_price,
        service_cost,
        electric_cost,
        water_cost,
        electric_old,
        electric_new,
        water_old,
        water_new,
        qrPayload,
        checkoutUrl,
        rooms ( room_code, branch:branches ( name ) )
      `

    const invoiceQuery = (select: string) =>
      supabase
        .from('invoices')
        .select(select)
        .eq('tenant_id', tenant.id)
        .order('issued_at', { ascending: false })

    let { data: invoices, error } = await invoiceQuery(invoiceSelectWithPayment)

    if (error && (error as { code?: string }).code === '42703') {
      console.warn(
        'invoices payment columns missing — run supabase/migrations/05_add_payos_payment_columns_invoices.sql or npm run db:migrate-invoices'
      )
      const fallback = await invoiceQuery(invoiceSelectBase)
      invoices = fallback.data
      error = fallback.error
    }

    if (error) throw error

    interface InvoiceRoom {
      room_code: string
      branch: { name: string } | null
    }

    const docs = ((invoices as any[]) || []).map((inv: any) => {
      const room = inv.rooms as unknown as InvoiceRoom | null
      return {
        id: inv.id,
        invoiceCode: inv.invoice_code,
        totalAmount: inv.total_amount,
        paymentStatus: inv.payment_status,
        issuedAt: inv.issued_at,
        dueDate: inv.due_date,
        due_date: inv.due_date,
        createdAt: inv.created_at,
        roomPrice: inv.room_price,
        serviceCost: inv.service_cost,
        electricCost: inv.electric_cost,
        waterCost: inv.water_cost,
        electricOld: inv.electric_old,
        electricNew: inv.electric_new,
        waterOld: inv.water_old,
        waterNew: inv.water_new,
        roomCode: room?.room_code ?? null,
        branchName: room?.branch?.name ?? null,
        qrPayload: inv.qrPayload,
        checkoutUrl: inv.checkoutUrl,
        paymentAccountNumber: inv.payment_account_number,
        paymentAccountName: inv.payment_account_name,
        paymentBankBin: inv.payment_bank_bin,
        paymentDescription: inv.payment_description,
        isPaid: inv.payment_status === 'paid',
        hasQr: Boolean(inv.qrPayload),
      }
    })

    return NextResponse.json({ success: true, docs })
  } catch (error: unknown) {
    console.error('Error fetching tenant invoices:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
