import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { syncExpiredContractNotifications } from '@/lib/contract-notification-sync'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!
    void syncExpiredContractNotifications(supabase, {
      userId: auth.dbUserId,
      role: auth.role,
      branchId: auth.branchId,
    }).catch((syncError) => {
      console.error('Failed to sync expired contract notifications:', syncError)
    })

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, user_id, title, body, type, is_read, created_at')
      .eq('user_id', auth.dbUserId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.dbUserId)
      .eq('is_read', false)

    return NextResponse.json({
      success: true,
      data: notifications ?? [],
      unreadCount: unreadCount ?? 0,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!
    const payload = await request.json().catch(() => ({}))
    const title = String(payload?.title ?? '').trim()
    const body = String(payload?.body ?? '').trim()
    const type = String(payload?.type ?? 'system').trim() || 'system'

    if (!title || !body) {
      return NextResponse.json({ error: 'Thiếu tiêu đề hoặc nội dung thông báo' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', auth.dbUserId)
      .eq('title', title)
      .eq('body', body)
      .eq('type', type)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing) {
      return NextResponse.json({ success: true, created: false, notificationId: existing.id })
    }

    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert({
        user_id: auth.dbUserId,
        title,
        body,
        type,
        is_read: false,
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      created: true,
      notificationId: inserted?.id ?? null,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!
    const body = await request.json().catch(() => ({}))
    const markAll = body?.markAll !== false

    if (markAll) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', auth.dbUserId)
        .eq('is_read', false)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc' })
    }

    const notificationId = body?.notificationId ?? body?.id
    if (!notificationId) {
      return NextResponse.json({ error: 'Thiếu notificationId' }, { status: 400 })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', auth.dbUserId)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
