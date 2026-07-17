import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncExpiredContractNotifications, syncExpiringContractWarnings } from '@/lib/contract-notification-sync'
import { syncOverdueInvoiceNotifications } from '@/lib/invoice-overdue-notification'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Xóa tất cả thông báo đã quá 7 ngày kể từ created_at.
 * Chạy mỗi ngày trong cron để giữ bảng notifications gọn.
 */
async function purgeOldNotifications(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  const { error, count } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff.toISOString())

  if (error) throw error
  return count ?? 0
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

  // 4. Xóa thông báo cũ hơn 7 ngày
  try {
    const deleted = await purgeOldNotifications(supabase)
    results.purgeOld = `ok (${deleted} deleted)`
  } catch (err) {
    console.error('[cron] purgeOldNotifications failed:', err)
    results.purgeOld = err instanceof Error ? err.message : String(err)
  }

  const allOk = Object.values(results).every((v) => v.startsWith('ok'))
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 207 })
}
