import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { syncExpiredContractNotifications } from '@/lib/contract-notification-sync'
import { createNotificationSchema, formatZodError } from '@/lib/validations'
import { dispatchNotification } from '@/lib/notification_dispatch'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function mapNotification(row: {
  id: string | number
  user_id: string
  title: string
  body: string
  type: string
  related_id?: string | null
  is_read: boolean
  created_at: string
  updated_at?: string | null
}) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.body,
    type: row.type,
    relatedId: row.related_id ?? null,
    isRead: row.is_read,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!
    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get('limit') ?? 100)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    void syncExpiredContractNotifications(supabase, {
      userId: auth.dbUserId,
      role: auth.role,
      branchId: auth.branchId,
    }).catch((syncError) => {
      console.error('Failed to sync expired contract notifications:', syncError)
    })

    let query = supabase
      .from('notifications')
      .select('id, user_id, title, body, type, related_id, is_read, created_at, updated_at')
      .eq('user_id', auth.dbUserId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error } = await query
    if (error) throw error

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.dbUserId)
      .eq('is_read', false)

    return NextResponse.json({
      success: true,
      data: (notifications ?? []).map(mapNotification),
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

    const body = await request.json().catch(() => null)
    const parsed = createNotificationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const supabase = auth.supabase!
    const { title, content, type, relatedId } = parsed.data
    const targetUserId = parsed.data.userId ?? auth.dbUserId

    if (targetUserId !== auth.dbUserId && auth.role === 'tenant') {
      return NextResponse.json({ error: 'Cư dân chỉ có thể tạo thông báo cho chính mình' }, { status: 403 })
    }

    await dispatchNotification(
      supabase,
      { userId: targetUserId },
      {
        title,
        body: content,
        type,
        relatedId: relatedId ?? null,
        data: relatedId ? { relatedId } : undefined,
      }
    )

    return NextResponse.json({ success: true, created: true })
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
        .update({ is_read: true, updated_at: new Date().toISOString() })
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
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', auth.dbUserId)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
