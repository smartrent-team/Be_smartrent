import { PayOS } from '@payos/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgPaymentConfig } from '@/lib/rbac'

export type InvoicePaymentPayload = {
  checkoutUrl: string
  paymentLinkId?: string
}

export async function attachPayOSToInvoice(
  supabase: SupabaseClient,
  invoice: { id: number; invoice_code: string; total_amount: number },
  orgPaymentConfig: OrgPaymentConfig | null | undefined
): Promise<{ payment: InvoicePaymentPayload | null; warning: string | null }> {
  const totalAmount = Number(invoice.total_amount)

  if (!Number.isFinite(totalAmount) || totalAmount < 2000) {
    return {
      payment: null,
      warning: 'Số tiền hóa đơn phải từ 2.000đ để thanh toán qua PayOS.',
    }
  }

  const clientId = orgPaymentConfig?.payosClientId
  const apiKey = orgPaymentConfig?.payosApiKey
  const checksumKey = orgPaymentConfig?.payosChecksumKey

  if (!clientId || !apiKey || !checksumKey) {
    return {
      payment: null,
      warning: 'Chủ trọ chưa cấu hình cổng thanh toán PayOS.',
    }
  }

  try {
    const payos = new PayOS({
      clientId,
      apiKey,
      checksumKey
    })
    
    // orderCode bắt buộc là số <= 9007199254740991
    // Dùng Date.now() kết hợp invoice.id để đảm bảo unique
    const orderCode = Number(Date.now().toString().slice(-9) + invoice.id.toString())

    const domain = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const body = {
      orderCode: orderCode,
      amount: Math.round(totalAmount),
      description: `HD ${invoice.invoice_code}`, // Giới hạn 25 ký tự
      returnUrl: `${domain}/invoices`,
      cancelUrl: `${domain}/invoices`
    }

    const paymentLinkRes = await payos.paymentRequests.create(body as any)

    const coreUpdate = {
      payment_link_id: String(orderCode), // Lưu lại orderCode để webhook đối chiếu
      checkoutUrl: paymentLinkRes.checkoutUrl,
      qrPayload: null, // Không dùng QR text cũ nữa
    }

    const { error: coreErr } = await supabase
      .from('invoices')
      .update(coreUpdate)
      .eq('id', invoice.id)

    if (coreErr) {
      console.error('Failed to save PayOS URL to invoices:', coreErr.message, coreErr)
      return {
        payment: null,
        warning: `PayOS đã tạo link nhưng không lưu được vào DB (${coreErr.message}).`,
      }
    }

    return {
      payment: {
        checkoutUrl: paymentLinkRes.checkoutUrl,
        paymentLinkId: String(orderCode),
      },
      warning: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('PayOS attach payment failed:', message)

    return { payment: null, warning: message }
  }
}

/** Thông báo cho app cư dân — ngắn gọn, không lộ cấu hình server. */
export function toTenantPaymentError(technicalWarning: string | null): string {
  if (!technicalWarning) {
    return 'Không thể tạo link thanh toán lúc này. Vui lòng thử lại sau hoặc liên hệ ban quản lý.'
  }
  if (technicalWarning.includes('2.000')) {
    return 'Hóa đơn chưa đủ điều kiện thanh toán (tối thiểu 2.000đ).'
  }
  if (technicalWarning.includes('chưa cấu hình')) {
    return 'Chủ trọ chưa cấu hình thanh toán tự động. Vui lòng chọn chuyển khoản thủ công.'
  }
  return 'Thanh toán tạm thời chưa khả dụng. Vui lòng liên hệ ban quản lý.'
}

