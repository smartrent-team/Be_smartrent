import { NextResponse, type NextRequest } from 'next/server'
import { payos } from '@/lib/payos'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verify webhook data sent from payOS
    const webhookData = payos.verifyPaymentWebhookData(body)

    if (webhookData.code === '00') {
      const paymentLinkId = webhookData.paymentLinkId
      const supabase = createAdminClient()

      // 1. Tìm hóa đơn bằng ID link thanh toán (hoặc ID trực tiếp làm phương án dự phòng)
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('id, payment_status, total_amount, invoice_code, tenant:tenant_id(id, user_id)')
        .or(`payment_link_id.eq.${paymentLinkId},id.eq.${webhookData.orderCode}`)
        .single()

      if (fetchError || !invoice) {
        return NextResponse.json({ message: 'Invoice not found' }, { status: 200 })
      }

      if (invoice.payment_status === 'paid') {
        return NextResponse.json({ message: 'Invoice already paid' }, { status: 200 })
      }

      // 2. Cập nhật trạng thái hóa đơn sang 'paid'
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      if (updateError) {
        throw updateError
      }

      // 3. Send Push Notification to Tenant
      const tenantData = invoice.tenant as unknown;
      const tenant = Array.isArray(tenantData) ? tenantData[0] as { id: number; user_id: string } : tenantData as { id: number; user_id: string } | null;
      if (tenant && tenant.id) {
        const title = '✅ Đã nhận tiền phòng'
        const pushBody = `Cảm ơn bạn! Hóa đơn ${invoice.invoice_code} số tiền ${invoice.total_amount?.toLocaleString('vi-VN')}đ đã được thanh toán thành công.`

        // Fetch device tokens for this tenant
        const { data: tokens } = await supabase
          .from('device_tokens')
          .select('token')
          .eq('tenant_id', tenant.id)

        if (tokens && tokens.length > 0) {
          for (const item of tokens) {
            await sendPushNotification(item.token, title, pushBody)
          }
        }

        // Save notification to DB
        if (tenant.user_id) {
          await supabase.from('notifications').insert({
            user_id: tenant.user_id,
            title,
            body: pushBody,
            type: 'invoice',
            isRead: false,
          })
        }
      }

      return NextResponse.json({ success: true, message: 'Payment successfully updated' }, { status: 200 })
    }

    return NextResponse.json({ success: false, message: 'Payment not completed or failed' }, { status: 200 })
  } catch (error: unknown) {
    console.error('PayOS Webhook Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    )
  }
}
