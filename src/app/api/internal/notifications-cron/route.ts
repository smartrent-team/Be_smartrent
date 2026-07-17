import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncExpiredContractNotifications, syncExpiringContractWarnings } from '@/lib/contract-notification-sync'
import { syncOverdueInvoiceNotifications } from '@/lib/invoice-overdue-notification'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Dọn dẹp thông báo cũ:
 *  - Đã đọc (is_read = true)  : xóa sau 7 ngày
 *  - Chưa đọc (is_read = false): xóa sau 30 ngày (giữ lâu hơn để tránh mất thông báo quan trọng)
 */
async function purgeOldNotifications(supabase: SupabaseClient): Promise<{ readDeleted: number; unreadDeleted: number }> {
  const cutoff7d = new Date()
  cutoff7d.setDate(cutoff7d.getDate() - 7)

  const cutoff30d = new Date()
  cutoff30d.setDate(cutoff30d.getDate() - 30)

  const { error: err1, count: readDeleted } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .eq('is_read', true)
    .lt('created_at', cutoff7d.toISOString())

  if (err1) throw err1

  const { error: err2, count: unreadDeleted } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .eq('is_read', false)
    .lt('created_at', cutoff30d.toISOString())

  if (err2) throw err2

  return { readDeleted: readDeleted ?? 0, unreadDeleted: unreadDeleted ?? 0 }
}

/**
 * Cron endpoint chạy mỗi ngày lúc 8:00 SA (Việt Nam, UTC+7 = 01:00 UTC).
 * Kích hoạt bởi Supabase pg_cron qua migration 14_setup_notifications_cron.sql
 * hoặc bất kỳ external scheduler nào với Bearer token.
 *
 * Việc thực hiện:
 *  1. syncExpiredContractNotifications  — đánh dấu expired + notify
 *  2. syncExpiringContractWarnings      — cảnh báo sắp hết hạn 30d / 7d
 *  3. syncOverdueInvoiceNotifications   — nhắc hóa đơn quá hạn
 *  4. purgeOldNotifications             — xóa thông báo cũ hơn 7 ngày
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: Record<string, string> = {}

  // 1. Hợp đồng đã hết hạn
  try {
    await syncExpiredContractNotifications(supabase, { userId: 'system', role: 'system' })
    results.contractExpired = 'ok'
  } catch (err) {
    console.error('[cron] syncExpiredContractNotifications failed:', err)
    results.contractExpired = err instanceof Error ? err.message : String(err)
  }

  // 2. Hợp đồng sắp hết hạn (30d / 7d)
  try {
    await syncExpiringContractWarnings(supabase)
    results.contractExpiring = 'ok'
  } catch (err) {
    console.error('[cron] syncExpiringContractWarnings failed:', err)
    results.contractExpiring = err instanceof Error ? err.message : String(err)
  }

  // 3. Hóa đơn quá hạn
  try {
    await syncOverdueInvoiceNotifications(supabase)
    results.invoiceOverdue = 'ok'
  } catch (err) {
    console.error('[cron] syncOverdueInvoiceNotifications failed:', err)
    results.invoiceOverdue = err instanceof Error ? err.message : String(err)
  }

  // 4. Dọn thông báo cũ (đã đọc > 7 ngày, chưa đọc > 30 ngày)
  try {
    const { readDeleted, unreadDeleted } = await purgeOldNotifications(supabase)
    results.purgeOld = `ok (read: ${readDeleted} deleted, unread: ${unreadDeleted} deleted)`
  } catch (err) {
    console.error('[cron] purgeOldNotifications failed:', err)
    results.purgeOld = err instanceof Error ? err.message : String(err)
  }

  const allOk = Object.values(results).every((v) => v.startsWith('ok'))
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 207 })
}
