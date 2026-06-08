import { buildVNPayUrl } from '@/lib/vnpay'
import type { SupabaseClient } from '@supabase/supabase-js'

export type InvoicePaymentPayload = {
  checkoutUrl: string
  paymentLinkId?: string
}

export async function attachVNPayToInvoice(
  supabase: SupabaseClient,
  invoice: { id: number; invoice_code: string; total_amount: number },
  ipAddr: string = '127.0.0.1'
): Promise<{ payment: InvoicePaymentPayload | null; warning: string | null }> {
  const totalAmount = Number(invoice.total_amount)

  if (!Number.isFinite(totalAmount) || totalAmount < 5000) {
    return {
      payment: null,
      warning: 'Số tiền hóa đơn phải từ 5.000đ để thanh toán qua VNPay.',
    }
  }

  try {
    const orderId = `${invoice.invoice_code.replace(/[^A-Za-z0-9]/g, '')}${new Date().getTime()}`
    
    const checkoutUrl = buildVNPayUrl({
      orderId: orderId,
      amount: Math.round(totalAmount),
      orderInfo: `ThanhToan${invoice.invoice_code.replace(/[^A-Za-z0-9]/g, '')}`,
      ipAddr,
    })

    const coreUpdate = {
      payment_link_id: orderId,
      checkoutUrl: checkoutUrl,
      qrPayload: null, // Không dùng QR code text nữa
    }

    const { error: coreErr } = await supabase
      .from('invoices')
      .update(coreUpdate)
      .eq('id', invoice.id)

    if (coreErr) {
      console.error('Failed to save VNPay URL to invoices:', coreErr.message, coreErr)
      return {
        payment: null,
        warning: `VNPay đã tạo link nhưng không lưu được vào DB (${coreErr.message}).`,
      }
    }

    return {
      payment: {
        checkoutUrl,
        paymentLinkId: orderId,
      },
      warning: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('VNPay attach payment failed:', message)

    return { payment: null, warning: message }
  }
}

/** Thông báo cho app cư dân — ngắn gọn, không lộ cấu hình server. */
export function toTenantPaymentError(technicalWarning: string | null): string {
  if (!technicalWarning) {
    return 'Không thể tạo link thanh toán lúc này. Vui lòng thử lại sau hoặc liên hệ ban quản lý.'
  }
  if (technicalWarning.includes('5.000')) {
    return 'Hóa đơn chưa đủ điều kiện thanh toán (tối thiểu 5.000đ). Vui lòng liên hệ ban quản lý.'
  }
  return 'Thanh toán tạm thời chưa khả dụng. Vui lòng liên hệ ban quản lý.'
}
