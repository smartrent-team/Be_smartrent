import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { qstashClient } from '@/infrastructure/qstash'

export async function GET(request: Request) {
  try {
    // Xác thực bằng CRON_SECRET từ Vercel
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Tìm tất cả hóa đơn chưa thanh toán hoặc thanh toán 1 phần
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

    // Gửi từng hóa đơn vào QStash
    let publishedCount = 0
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    for (const inv of invoices) {
      // Gửi vào QStash thay vì gọi gửi Push trực tiếp
      await qstashClient.publishJSON({
        url: `${baseUrl}/api/workers/remind-debt`,
        body: {
          invoice_id: inv.id,
          tenant_id: inv.tenant_id,
          room_code: (inv.rooms as any)?.room_code,
          invoice_code: inv.invoice_code
        },
      })
      publishedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Đã đẩy ${publishedCount} hóa đơn vào hàng đợi QStash thành công.`,
    })
  } catch (error: any) {
    console.error('Error in cron job remind-debt:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ', details: error.message }, { status: 500 })
  }
}
