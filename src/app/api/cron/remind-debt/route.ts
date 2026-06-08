import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push'

export async function GET(request: Request) {
  try {
    // 1. Xác thực bằng CRON_SECRET để chống gọi trái phép
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // 2. Tìm tất cả hóa đơn chưa thanh toán hoặc thanh toán 1 phần (unpaid, partial)
    // Cần phải có tenant_id để biết ai mà nhắc
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id, 
        invoice_code, 
        tenant_id, 
        payment_status,
        rooms (
          room_code
        )
      `)
      .in('payment_status', ['unpaid', 'partial'])
      .not('tenant_id', 'is', null)

    if (invoiceError) throw invoiceError
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ success: true, message: 'Không có hóa đơn nào cần nhắc.' })
    }

    // 3. Gom nhóm tenant_id lại để lấy token
    const tenantIds = [...new Set(invoices.map(inv => inv.tenant_id))]

    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('tenant_id, token')
      .in('tenant_id', tenantIds)

    if (tokenError) throw tokenError

    // Map tenant_id => mảng token
    const tokenMap = new Map<number, string[]>()
    tokens?.forEach(t => {
      const arr = tokenMap.get(t.tenant_id!) || []
      arr.push(t.token)
      tokenMap.set(t.tenant_id!, arr)
    })

    // 4. Bắn thông báo
    let sentCount = 0
    const promises: Promise<void>[] = []

    for (const inv of invoices) {
      const roomCode = (inv.rooms as any)?.room_code || 'N/A'
      const title = 'Đến hạn thanh toán tiền phòng!'
      const body = `Phòng ${roomCode} có hóa đơn ${inv.invoice_code} chưa thanh toán. Vui lòng thanh toán nhé!`
      
      const tks = tokenMap.get(inv.tenant_id!)
      if (tks && tks.length > 0) {
        for (const tk of tks) {
          promises.push(sendPushNotification(tk, title, body))
          sentCount++
        }
      }
    }

    // Chờ tất cả thông báo được gửi
    await Promise.allSettled(promises)

    return NextResponse.json({
      success: true,
      message: `Đã quét ${invoices.length} hóa đơn. Đã gửi ${sentCount} thông báo.`,
    })
  } catch (error: any) {
    console.error('Error in cron job remind-debt:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ', details: error.message }, { status: 500 })
  }
}
