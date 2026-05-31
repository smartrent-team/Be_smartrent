import { NextResponse, type NextRequest } from 'next/server'
import { verifyVNPaySignature } from '@/lib/vnpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vnp_Params: Record<string, string> = {}

    searchParams.forEach((value, key) => {
      vnp_Params[key] = value
    })

    const isVerified = verifyVNPaySignature({ ...vnp_Params })

    if (!isVerified) {
      return NextResponse.json({ RspCode: '97', Message: 'Checksum failed' }, { status: 200 })
    }

    const orderId = vnp_Params['vnp_TxnRef']
    const rspCode = vnp_Params['vnp_ResponseCode']
    
    // IPN chỉ xử lý khi thành công hoặc cập nhật trạng thái
    if (rspCode !== '00') {
      return NextResponse.json({ RspCode: '00', Message: 'Success with non-00 status' }, { status: 200 })
    }

    const supabase = createAdminClient()

    // 1. Tìm hóa đơn
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, payment_status, total_amount, invoice_code, tenant:tenant_id(id, user_id)')
      .eq('payment_link_id', orderId)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ RspCode: '01', Message: 'Order not found' }, { status: 200 })
    }

    if (invoice.payment_status === 'paid') {
      return NextResponse.json({ RspCode: '02', Message: 'Order already confirmed' }, { status: 200 })
    }

    // Kiểm tra số tiền
    const vnpAmount = Number(vnp_Params['vnp_Amount']) / 100 // VNPay nhân 100
    if (vnpAmount !== Number(invoice.total_amount)) {
      return NextResponse.json({ RspCode: '04', Message: 'invalid amount' }, { status: 200 })
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
      const pushBody = `Cảm ơn bạn! Hóa đơn ${invoice.invoice_code} số tiền ${invoice.total_amount?.toLocaleString('vi-VN')}đ đã được thanh toán thành công qua VNPay.`

      // Fetch device tokens for this tenant
      const { data: tokens } = await supabase
        .from('device_tokens')
        .select('token')
        .eq('tenant_id', tenant.id)

      if (tokens && tokens.length > 0) {
        for (const item of tokens) {
          try {
            await sendPushNotification(item.token, title, pushBody)
          } catch (pushErr) {
            console.error('Push notification failed:', pushErr)
          }
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

    return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' }, { status: 200 })
  } catch (error: unknown) {
    console.error('VNPay IPN Error:', error)
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' }, { status: 200 })
  }
}
