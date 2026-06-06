import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { attachVNPayToInvoice, toTenantPaymentError } from '@/lib/invoice-payment'

type RouteContext = { params: Promise<{ id: string }> }

const SELECT_FIELDS = `
  id, invoice_code, total_amount, payment_status, issued_at, created_at,
  checkoutUrl, tenant_id, room_id
`

async function fetchInvoice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  invoiceId: number
) {
  return await supabase
    .from('invoices')
    .select(SELECT_FIELDS)
    .eq('id', invoiceId)
    .maybeSingle()
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'tenant') {
      return NextResponse.json({ error: 'API chỉ dành cho cư dân' }, { status: 403 })
    }

    const { id } = await context.params
    const invoiceId = Number(id)
    if (!Number.isFinite(invoiceId)) {
      return NextResponse.json({ error: 'ID hóa đơn không hợp lệ' }, { status: 400 })
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

    const { data: invoice, error: invError } = await fetchInvoice(supabase, invoiceId)

    if (invError || !invoice) {
      const msg = invError?.message || 'Không tìm thấy hóa đơn'
      return NextResponse.json({ error: msg }, { status: invError ? 500 : 404 })
    }

    const belongsToTenant =
      invoice.tenant_id === tenant.id ||
      (invoice.room_id != null && invoice.room_id === tenant.room_id)

    if (!belongsToTenant) {
      return NextResponse.json({ error: 'Bạn không có quyền với hóa đơn này' }, { status: 403 })
    }

    if (invoice.payment_status === 'paid') {
      return NextResponse.json({ error: 'Hóa đơn đã được thanh toán' }, { status: 400 })
    }

    if (invoice.checkoutUrl) {
      return NextResponse.json({
        success: true,
        invoice: mapInvoice(invoice),
        created: false,
      })
    }

    // IP của người dùng thực tế sẽ được proxy pass nếu qua nginx, tạm dùng 127.0.0.1
    const { payment, warning } = await attachVNPayToInvoice(
      supabase, 
      {
        id: invoice.id,
        invoice_code: invoice.invoice_code,
        total_amount: invoice.total_amount,
      },
      '127.0.0.1' 
    )

    if (!payment) {
      console.warn('[payment-link] tenant invoice', invoiceId, warning)
      return NextResponse.json(
        { error: toTenantPaymentError(warning) },
        { status: 502 }
      )
    }

    const { data: updated } = await fetchInvoice(supabase, invoiceId)
    const payload = updated ? mapInvoice(updated) : mapInvoiceFromPayment(invoice, payment)

    return NextResponse.json({
      success: true,
      created: true,
      invoice: payload,
      ...(warning ? { paymentWarning: warning } : {}),
    })
  } catch (error: unknown) {
    console.error('POST payment-link error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}

function mapInvoiceFromPayment(
  invoice: Record<string, unknown>,
  payment: {
    checkoutUrl: string
  }
) {
  return {
    id: invoice.id,
    invoiceCode: invoice.invoice_code,
    totalAmount: invoice.total_amount,
    paymentStatus: invoice.payment_status,
    issuedAt: invoice.issued_at,
    createdAt: invoice.created_at,
    checkoutUrl: payment.checkoutUrl,
    isPaid: false,
    hasLink: true,
  }
}

function mapInvoice(inv: Record<string, unknown>) {
  return {
    id: inv.id,
    invoiceCode: inv.invoice_code,
    totalAmount: inv.total_amount,
    paymentStatus: inv.payment_status,
    issuedAt: inv.issued_at,
    createdAt: inv.created_at,
    checkoutUrl: inv.checkoutUrl,
    isPaid: inv.payment_status === 'paid',
    hasLink: Boolean(inv.checkoutUrl),
  }
}
