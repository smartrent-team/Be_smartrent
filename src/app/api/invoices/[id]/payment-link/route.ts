import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { attachPayOsPaymentToInvoice, toTenantPaymentError } from '@/lib/invoice-payment'

type RouteContext = { params: Promise<{ id: string }> }

const SELECT_WITH_QR = `
  id, invoice_code, total_amount, payment_status, issued_at, created_at,
  qrPayload, checkoutUrl, tenant_id, room_id
`

const SELECT_WITH_BANK = `
  ${SELECT_WITH_QR.trim()},
  payment_account_number, payment_account_name, payment_bank_bin, payment_description
`

async function fetchInvoice(
  supabase: { from: (table: string) => any },
  invoiceId: number
) {
  let result = await supabase
    .from('invoices')
    .select(SELECT_WITH_BANK)
    .eq('id', invoiceId)
    .maybeSingle()

  if (result.error && (result.error as { code?: string }).code === '42703') {
    result = await supabase
      .from('invoices')
      .select(SELECT_WITH_QR)
      .eq('id', invoiceId)
      .maybeSingle()
  }

  return result
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

    if (invoice.qrPayload) {
      return NextResponse.json({
        success: true,
        invoice: mapInvoice(invoice),
        created: false,
      })
    }

    const { payment, warning } = await attachPayOsPaymentToInvoice(supabase, {
      id: invoice.id,
      invoice_code: invoice.invoice_code,
      total_amount: invoice.total_amount,
    })

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
    qrPayload: string
    checkoutUrl: string
    accountNumber: string
    accountName: string
    bankBin: string
    description: string
  }
) {
  return {
    id: invoice.id,
    invoiceCode: invoice.invoice_code,
    totalAmount: invoice.total_amount,
    paymentStatus: invoice.payment_status,
    issuedAt: invoice.issued_at,
    createdAt: invoice.created_at,
    qrPayload: payment.qrPayload,
    checkoutUrl: payment.checkoutUrl,
    paymentAccountNumber: payment.accountNumber,
    paymentAccountName: payment.accountName,
    paymentBankBin: payment.bankBin,
    paymentDescription: payment.description,
    isPaid: false,
    hasQr: true,
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
    qrPayload: inv.qrPayload,
    checkoutUrl: inv.checkoutUrl,
    paymentAccountNumber: inv.payment_account_number ?? null,
    paymentAccountName: inv.payment_account_name ?? null,
    paymentBankBin: inv.payment_bank_bin ?? null,
    paymentDescription: inv.payment_description ?? null,
    isPaid: inv.payment_status === 'paid',
    hasQr: Boolean(inv.qrPayload),
  }
}
