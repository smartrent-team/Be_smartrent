import { NextRequest, NextResponse } from 'next/server'
import { syncExpiredContractNotifications } from '@/lib/contract-notification-sync'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * @deprecated Sử dụng /api/internal/notifications-cron thay thế.
 * Endpoint này được giữ lại để backward compatibility với các scheduler cũ.
 * notifications-cron chạy đầy đủ tất cả jobs (expired + expiring warning + invoice overdue).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await syncExpiredContractNotifications(createAdminClient(), {
      userId: 'system',
      role: 'system',
    })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Contract expiry notification sync failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
