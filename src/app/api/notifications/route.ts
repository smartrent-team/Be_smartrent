import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { createNotificationSchema, formatZodError } from '@/lib/validations'
import { dispatchNotification } from '@/lib/notification_dispatch'
import { syncOverdueInvoiceNotifications } from '@/lib/invoice-overdue-notification'
import { syncExpiringContractWarnings } from '@/lib/contract-notification-sync'

// Cache thời gian sync gần nhất để tránh chạy liên tục mỗi request
const syncCooldownMs = 60 * 60 * 1000 // 1 giờ
const lastSyncTime: Record<string, number> = {}

function shouldSync(key: string): boolean {
  const last = lastSyncTime[key] ?? 0
  const now = Date.now()
  if (now - last < syncCooldownMs) return false
  lastSyncTime[key] = now
  return true
}

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
  // Trích endDate từ related_id nếu là contract notification
  // related_id = "contract:{id}" — cần query thêm end_date
  // Để tránh N+1 query, endDate được Flutter tính từ body hoặc endDate field riêng
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.body,
    body: row.body,
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

    // Lazy sync — chỉ chạy tối đa 1 lần/giờ để tránh spam notification
    if (shouldSync('overdue_invoices')) {
      try {
        await syncOverdueInvoiceNotifications(supabase)
      } catch (e) {
        console.warn('[notifications GET] syncOverdueInvoiceNotifications warning:', e)
      }
    }

    if (shouldSync('expiring_contracts')) {
      try {
        await syncExpiringContractWarnings(supabase)
      } catch (e) {
        console.warn('[notifications GET] syncExpiringContractWarnings warning:', e)
      }
    }

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

    // Enrich endDate cho contract notifications (tránh số ngày bị đóng băng trong body)
    const contractNotifTypes = ['contract_expiring_7d', 'contract_expiring_30d', 'contract_expired']
    const contractNotifs = (notifications ?? []).filter(
      (n) => contractNotifTypes.includes(n.type) && n.related_id?.startsWith('contract:')
    )

    const endDateMap: Record<number, string> = {}
    if (contractNotifs.length > 0) {
      const contractIds = contractNotifs
        .map((n) => parseInt(n.related_id!.replace('contract:', ''), 10))
        .filter((id) => !isNaN(id))

      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, end_date')
        .in('id', contractIds)

      for (const c of contracts ?? []) {
        if (c.end_date) endDateMap[c.id] = c.end_date
      }
    }

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.dbUserId)
      .eq('is_read', false)

    return NextResponse.json({
      success: true,
      data: (notifications ?? []).map((n) => {
        const mapped = mapNotification(n)
        // Thêm endDate real-time cho contract notifications
        if (n.related_id?.startsWith('contract:')) {
          const contractId = parseInt(n.related_id.replace('contract:', ''), 10)
          if (!isNaN(contractId) && endDateMap[contractId]) {
            return { ...mapped, endDate: endDateMap[contractId] }
          }
        }
        return mapped
      }),
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

    // Dedup: nếu đã có notification cùng (user_id, related_id, type) thì không tạo mới
    if (relatedId) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('related_id', relatedId)
        .eq('type', type)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ success: true, created: false, deduplicated: true })
      }
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
