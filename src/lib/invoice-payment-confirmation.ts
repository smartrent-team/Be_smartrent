import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotification } from '@/lib/notification_dispatch'

type TenantRef = {
  id?: number
  user_id?: string
} | null

type InvoiceRecord = {
  id: number
  invoice_code: string
  total_amount: number
  payment_status: string
  tenant?: TenantRef | TenantRef[]
}

type ConfirmInvoicePaymentResult =
  | {
      success: true
      invoiceId: number
      invoiceCode: string
      alreadyConfirmed: boolean
    }
  | {
      success: false
      error: string
    }

function normalizeTenant(value: InvoiceRecord['tenant']): { id?: number; user_id?: string } | null {
  if (!value) return null
  if (Array.isArray(value)) {
    return (value[0] as { id?: number; user_id?: string } | undefined) ?? null
  }
  return value
}

export async function confirmInvoicePaymentAndNotify(
  supabase: SupabaseClient,
  paymentLinkId: string,
  paidAmount: number
): Promise<ConfirmInvoicePaymentResult> {
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, invoice_code, total_amount, payment_status, tenant:tenant_id(id, user_id)')
    .eq('payment_link_id', paymentLinkId)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (!invoice) {
    return { success: false, error: 'Không tìm thấy hóa đơn' }
  }

  if (invoice.payment_status === 'paid') {
    return {
      success: true,
      invoiceId: invoice.id,
      invoiceCode: invoice.invoice_code,
      alreadyConfirmed: true,
    }
  }

  if (Number(invoice.total_amount) !== paidAmount) {
    return { success: false, error: 'Số tiền thanh toán không khớp' }
  }

  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)
    .eq('payment_status', 'unpaid')
    .select('id, invoice_code, total_amount, tenant:tenant_id(id, user_id)')
    .maybeSingle()

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  if (!updatedInvoice) {
    return {
      success: true,
      invoiceId: invoice.id,
      invoiceCode: invoice.invoice_code,
      alreadyConfirmed: true,
    }
  }

  const tenant = normalizeTenant((updatedInvoice as InvoiceRecord).tenant)
  if (tenant?.user_id) {
    await dispatchNotification(
      supabase,
      { userId: tenant.user_id, tenantId: tenant.id ?? null },
      {
        title: 'Đã nhận tiền phòng',
        body: `Cảm ơn bạn! Hóa đơn ${updatedInvoice.invoice_code} số tiền ${Number(updatedInvoice.total_amount).toLocaleString('vi-VN')}đ đã được thanh toán thành công qua VNPay.`,
        type: 'payment',
      }
    )
  }

  return {
    success: true,
    invoiceId: updatedInvoice.id,
    invoiceCode: updatedInvoice.invoice_code,
    alreadyConfirmed: false,
  }
}
