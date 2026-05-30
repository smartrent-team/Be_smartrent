import { payos } from '@/lib/payos'

export type InvoicePaymentPayload = {
  qrPayload: string
  checkoutUrl: string
  accountNumber: string
  accountName: string
  bankBin: string
  description: string
  paymentLinkId: string
  expiredAt?: number
}

const MIGRATION_HINT =
  'Chạy SQL migration: supabase/migrations/05_add_payos_payment_columns_invoices.sql (hoặc npm run db:migrate-invoices).'

export async function attachPayOsPaymentToInvoice(
  supabase: { from: (table: string) => any },
  invoice: { id: number; invoice_code: string; total_amount: number }
): Promise<{ payment: InvoicePaymentPayload | null; warning: string | null }> {
  const totalAmount = Number(invoice.total_amount)

  if (!Number.isFinite(totalAmount) || totalAmount < 2000) {
    return {
      payment: null,
      warning: 'Số tiền hóa đơn phải từ 2.000đ để tạo mã QR PayOS.',
    }
  }

  try {
    const returnUrl = process.env.PAYOS_RETURN_URL || 'http://localhost:3000/payment-success'
    const cancelUrl = process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/payment-cancel'
    const uniqueOrderCode = Number(
      Date.now().toString().slice(-6) + String(invoice.id % 1000).padStart(3, '0')
    )

    const paymentLink = await payos.paymentRequests.create({
      orderCode: uniqueOrderCode,
      amount: totalAmount,
      description: `TT ${invoice.invoice_code}`.slice(0, 25),
      returnUrl,
      cancelUrl,
    })

    const coreUpdate = {
      payment_link_id: paymentLink.paymentLinkId,
      checkoutUrl: paymentLink.checkoutUrl,
      qrPayload: paymentLink.qrCode,
    }

    const { error: coreErr } = await supabase
      .from('invoices')
      .update(coreUpdate)
      .eq('id', invoice.id)

    if (coreErr) {
      console.error('Failed to save QR to invoices:', coreErr.message, coreErr)
      return {
        payment: null,
        warning: `PayOS đã tạo link nhưng không lưu được vào DB (${coreErr.message}). ${MIGRATION_HINT}`,
      }
    }

    const extendedUpdate = {
      payment_account_number: paymentLink.accountNumber,
      payment_account_name: paymentLink.accountName,
      payment_bank_bin: paymentLink.bin,
      payment_description: paymentLink.description,
    }

    const { error: extErr } = await supabase
      .from('invoices')
      .update(extendedUpdate)
      .eq('id', invoice.id)

    if (extErr) {
      console.warn('Optional payment bank columns not saved:', extErr.message)
    }

    return {
      payment: {
        qrPayload: paymentLink.qrCode,
        checkoutUrl: paymentLink.checkoutUrl,
        accountNumber: paymentLink.accountNumber,
        accountName: paymentLink.accountName,
        bankBin: paymentLink.bin,
        description: paymentLink.description,
        paymentLinkId: paymentLink.paymentLinkId,
        expiredAt: paymentLink.expiredAt,
      },
      warning: extErr
        ? `QR đã lưu. Thông tin TK ngân hàng chưa lưu DB — ${MIGRATION_HINT}`
        : null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('PayOS attach payment failed:', message)

    const warning = buildPayOsFailureWarning(message)
    return { payment: null, warning }
  }
}

/** Chi tiết kỹ thuật — dùng cho quản lý / log server. */
export function buildPayOsFailureWarning(message: string): string {
  if (message.includes('201') || message.toLowerCase().includes('signature')) {
    return (
      'PayOS báo chữ ký không hợp lệ (code 201). Vào my.payos.vn → Kênh thanh toán → ' +
      'copy lại đủ 3 key (Client ID, API Key, Checksum Key) của CÙNG một kênh, dán vào .env rồi restart server.'
    )
  }
  return 'Không tạo được mã QR PayOS. Kiểm tra PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env.'
}

/** Thông báo cho app cư dân — ngắn gọn, không lộ cấu hình server. */
export function toTenantPaymentError(technicalWarning: string | null): string {
  if (!technicalWarning) {
    return 'Không thể tạo mã QR lúc này. Vui lòng thử lại sau hoặc liên hệ ban quản lý.'
  }
  if (technicalWarning.includes('2.000')) {
    return 'Hóa đơn chưa đủ điều kiện thanh toán QR. Vui lòng liên hệ ban quản lý.'
  }
  if (technicalWarning.includes('migration') || technicalWarning.includes('DB')) {
    return 'Hóa đơn chưa có mã QR. Vui lòng liên hệ ban quản lý để được hỗ trợ thanh toán.'
  }
  return 'Thanh toán QR tạm thời chưa khả dụng. Vui lòng liên hệ ban quản lý.'
}
