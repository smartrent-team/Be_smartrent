import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PayOS } from '@payos/node'
import { sendPushNotification } from '@/lib/push'
import { redis } from '@/lib/redis'

export async function POST(req: Request) {
  try {
    const body = await req.json()


    // PayOS webhook payload: { code, desc, data: { orderCode, amount, ... }, signature }
    const { data, signature } = body

    if (!data || !data.orderCode || !signature) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const orderCode = String(data.orderCode)

    const supabase = createAdminClient()

    // 1. Tìm hoá đơn tương ứng và lấy organization_id
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select(`
        id, 
        payment_status, 
        tenant_id, 
        invoice_code, 
        total_amount, 
        rooms(
          branches(organization_id)
        )
      `)
      .eq('payment_link_id', orderCode)
      .single()

    if (invoiceErr || !invoice) {
      console.warn(`[PayOS Webhook] Invoice not found for orderCode ${orderCode}`)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Nếu đã thanh toán rồi thì bỏ qua
    if (invoice.payment_status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already paid' })
    }

    // Lấy organization_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const room = Array.isArray(invoice.rooms) ? invoice.rooms[0] : invoice.rooms as any
    const branch = room?.branches ? (Array.isArray(room.branches) ? room.branches[0] : room.branches) : null
    const organizationId = branch?.organization_id

    if (!organizationId) {
      console.warn(`[PayOS Webhook] Organization not found for invoice ${invoice.id}`)
      return NextResponse.json({ error: 'Org not found' }, { status: 404 })
    }

    // 2. Lấy cấu hình PayOS của Tổ chức đó
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('payos_client_id, payos_api_key, payos_checksum_key')
      .eq('id', organizationId)
      .single()

    if (orgErr || !org || !org.payos_checksum_key) {
      console.warn(`[PayOS Webhook] PayOS config missing for org ${organizationId}`)
      return NextResponse.json({ error: 'PayOS config missing' }, { status: 400 })
    }

    // 3. Xác thực chữ ký webhook
    const payos = new PayOS({
      clientId: org.payos_client_id,
      apiKey: org.payos_api_key,
      checksumKey: org.payos_checksum_key
    })
    
    try {
      const webhookData = await payos.webhooks.verify(body)

    } catch (e) {
      console.error('[PayOS Webhook] Signature verification failed:', e)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 4. Kiểm tra trạng thái của giao dịch (Chỉ khi success thì mới gạch nợ)
    if (body.code === '00' && data.amount > 0) {
      // 5. Cập nhật hoá đơn
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoice.id)

      if (updateErr) {
        console.error('[PayOS Webhook] Failed to update invoice:', updateErr)
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
      }



      // 6. Gửi Push Notification cho cư dân
      if (invoice.tenant_id) {
        const { data: tokens } = await supabase
          .from('device_tokens')
          .select('token')
          .eq('tenant_id', invoice.tenant_id)
        
        if (tokens && tokens.length > 0) {
          const title = '✅ Thanh toán thành công'
          const message = `Hoá đơn ${invoice.invoice_code} (${invoice.total_amount?.toLocaleString()}đ) đã được thanh toán qua PayOS. Cảm ơn bạn!`
          for (const item of tokens) {
            await sendPushNotification(item.token, title, message).catch(err => console.error('Push error:', err))
          }
        }
      }

      // 7. Xoá Cache Dashboard để cập nhật báo cáo Real-time
      try {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}_${now.getMonth() + 1}`
        const cacheKey = `dashboard_stats:${organizationId}:${currentMonth}`
        await redis.del(cacheKey)

      } catch (redisErr) {
        console.error('[PayOS Webhook] Failed to invalidate cache:', redisErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PayOS Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
