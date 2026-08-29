import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const INTERVAL_MS = 1 * 60 * 1000 // 1 phút

let schedulerStarted = false

async function runAutoLock() {
  try {
    const { processExpiredCheckoutTenants } = await import('@/lib/auto-lock-expired')
    const supabase = createAdminClient()
    const { processed, results } = await processExpiredCheckoutTenants(supabase)

    const locked = results.filter((r) => r.action.startsWith('locked')).length
    const skipped = results.filter((r) => r.action === 'skipped').length
    const blocked = results.filter((r) => r.action.startsWith('blocked')).length

    // Chỉ log khi có thay đổi thực tế hoặc sự cố
    if (locked > 0 || blocked > 0) {
      console.log(
        `[auto-lock] ${new Date().toLocaleTimeString('vi-VN')} — processed: ${processed} | locked: ${locked} | skipped: ${skipped} | blocked: ${blocked}`
      )
    }
  } catch (err) {
    console.error('[auto-lock] Lỗi quét hợp đồng:', err)
  }
}

/**
 * GET /api/internal/startup
 * Được gọi một lần khi server khởi động để kick off interval auto-lock.
 * Endpoint này chạy hoàn toàn server-side, không bundle vào browser.
 */
export async function GET() {
  if (schedulerStarted) {
    return NextResponse.json({ ok: true, message: 'Scheduler đã chạy rồi' })
  }

  schedulerStarted = true
  console.log(`[auto-lock] Khởi động scheduler — quét mỗi ${INTERVAL_MS / 60000} phút`)

  // Chạy ngay lập tức
  await runAutoLock()

  // Lặp lại mỗi 1 phút
  setInterval(runAutoLock, INTERVAL_MS)

  return NextResponse.json({ ok: true, message: 'Scheduler đã khởi động' })
}
