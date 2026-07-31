import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/notifications-cleanup
 * Xóa notification bị duplicate trong DB (giữ lại bản mới nhất mỗi nhóm).
 * Bảo vệ bằng INTERNAL_CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Lấy tất cả notification, nhóm theo (user_id, related_id, type)
  // Giữ lại id lớn nhất (mới nhất), xóa các bản còn lại
  const { data: duplicates, error } = await supabase.rpc('delete_duplicate_notifications')

  if (error) {
    // Fallback nếu chưa có RPC: dùng raw query
    const { data: allNotifs, error: fetchErr } = await supabase
      .from('notifications')
      .select('id, user_id, related_id, type, created_at')
      .not('related_id', 'is', null)
      .order('created_at', { ascending: false })

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    // Tìm duplicate: nhóm theo (user_id, related_id, type), giữ id đầu tiên (mới nhất)
    const seen = new Map<string, number>()
    const toDelete: number[] = []

    for (const n of allNotifs ?? []) {
      const key = `${n.user_id}|${n.related_id}|${n.type}`
      if (seen.has(key)) {
        toDelete.push(n.id)
      } else {
        seen.set(key, n.id)
      }
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ success: true, deleted: 0, message: 'Không có duplicate' })
    }

    const { error: delErr, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .in('id', toDelete)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: count ?? toDelete.length,
      message: `Đã xóa ${count ?? toDelete.length} notification duplicate`,
    })
  }

  return NextResponse.json({ success: true, result: duplicates })
}
