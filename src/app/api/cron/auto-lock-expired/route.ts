import { NextResponse, type NextRequest } from 'next/server'
import { processExpiredCheckoutTenants } from '@/lib/auto-lock-expired'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/auto-lock-expired
 *
 * Khóa tài khoản cư dân khi hợp đồng hết hạn và yêu cầu trả phòng đã được xác nhận.
 * Cũng được gọi tự động từ /api/internal/notifications-cron mỗi ngày.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET ?? process.env.INTERNAL_CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      const cronHeader = request.headers.get('x-cron-secret')
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret
      if (!isAuthorized) {
        return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 })
      }
    }

    const supabase = createAdminClient()
    const { processed, results } = await processExpiredCheckoutTenants(supabase)

    return NextResponse.json({
      success: true,
      processed,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('[auto-lock-expired] Lỗi không xác định:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ', details: msg }, { status: 500 })
  }
}
