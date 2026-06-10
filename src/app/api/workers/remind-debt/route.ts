import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { sendPushNotification } from '@/infrastructure/push'

async function handler(req: Request) {
  try {
    const payload = await req.json()
    const { invoice_id, tenant_id, room_code, invoice_code } = payload

    if (!invoice_id || !tenant_id) {
      console.warn('QStash Worker: Missing invoice_id or tenant_id', payload)
      return NextResponse.json({ error: 'Missing payload data' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Fetch tokens for this tenant
    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('tenant_id', tenant_id)

    if (tokenError) {
      console.error(`QStash Worker: Error fetching tokens for tenant ${tenant_id}`, tokenError)
      throw tokenError
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: true, message: `No device token for tenant ${tenant_id}` })
    }

    // 2. Send Push Notifications
    const title = 'Đến hạn thanh toán tiền phòng!'
    const body = `Phòng ${room_code || 'N/A'} có hóa đơn ${invoice_code || 'N/A'} chưa thanh toán. Vui lòng thanh toán nhé!`

    const promises = tokens.map(t => sendPushNotification(t.token, title, body))
    await Promise.allSettled(promises)

    return NextResponse.json({ success: true, sent: tokens.length })

  } catch (error: any) {
    console.error('QStash Worker: Error', error)
    return NextResponse.json({ error: 'Worker failed', details: error.message }, { status: 500 })
  }
}

// verifySignatureAppRouter ensures the request actually comes from Upstash QStash
export const POST = verifySignatureAppRouter(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || 'dummy_key',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || 'dummy_key',
})
