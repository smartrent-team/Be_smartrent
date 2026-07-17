import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/push'

export type NotificationRecipient = {
  userId: string
  tenantId?: number | null
}

export type NotificationPayload = {
  title: string
  body: string
  type: string
  relatedId?: string | null
  data?: Record<string, string>
}

async function fetchRecipientTokens(
  supabase: SupabaseClient,
  recipient: NotificationRecipient
) {
  let query = supabase.from('device_tokens').select('token')

  if (recipient.tenantId != null) {
    query = query.or(`user_id.eq.${recipient.userId},tenant_id.eq.${recipient.tenantId}`)
  } else {
    query = query.eq('user_id', recipient.userId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch device tokens:', error)
    return []
  }

  return (data ?? [])
    .map((item: { token?: string }) => String(item.token ?? '').trim())
    .filter((token: string, index: number, tokens: string[]) => token && tokens.indexOf(token) === index)
}

/**
 * Map type tự do → giá trị an toàn để tránh lỗi enum trên DB cũ.
 * Sau khi chạy migration 16 (type thành TEXT), hàm này vẫn hoạt động bình thường.
 */
function safeNotificationType(type: string): string {
  // Nếu DB đã dùng TEXT → trả về nguyên giá trị
  // Nếu DB vẫn dùng enum và chưa migrate → map về giá trị enum an toàn
  const enumSafeValues = new Set(['invoice', 'ticket', 'contract', 'payment', 'system'])
  if (enumSafeValues.has(type)) return type

  // Map các type mới về type gốc tương ứng nếu enum chưa được migrate
  const typeMap: Record<string, string> = {
    invoice_overdue: 'invoice',
    contract_expired: 'contract',
    contract_expiring_30d: 'contract',
    contract_expiring_7d: 'contract',
  }
  return typeMap[type] ?? 'system'
}

/**
 * Insert notification record vào DB.
 * - Thử với related_id + type đầy đủ trước.
 * - Nếu lỗi PGRST204 (cột related_id chưa có) → thử lại không có related_id.
 * - Nếu lỗi 22P02 (enum type không hợp lệ) → thử lại với type được map về enum gốc.
 */
async function insertNotificationRecord(
  supabase: SupabaseClient,
  recipient: NotificationRecipient,
  payload: NotificationPayload
): Promise<string | null> {
  const baseRecord = {
    user_id: recipient.userId,
    title: payload.title,
    body: payload.body,
    is_read: false,
    updated_at: new Date().toISOString(),
  }

  // Lần 1: đầy đủ (TEXT type + related_id)
  const { data: inserted, error: err1 } = await supabase
    .from('notifications')
    .insert({ ...baseRecord, type: payload.type, related_id: payload.relatedId ?? null })
    .select('id')
    .single()

  if (!err1) return String(inserted?.id ?? '')

  // Lần 2: enum chưa migrate — map type + giữ related_id
  if (err1.code === '22P02' && err1.message?.includes('enum_notifications_type')) {
    console.warn(`[notification_dispatch] enum type "${payload.type}" not valid, mapping to safe value. Run migration 16.`)
    const { data: d2, error: err2 } = await supabase
      .from('notifications')
      .insert({ ...baseRecord, type: safeNotificationType(payload.type), related_id: payload.relatedId ?? null })
      .select('id')
      .single()

    if (!err2) return String(d2?.id ?? '')

    // Lần 3: enum + không có related_id
    if (err2.code === 'PGRST204' && err2.message?.includes('related_id')) {
      const { data: d3, error: err3 } = await supabase
        .from('notifications')
        .insert({ ...baseRecord, type: safeNotificationType(payload.type) })
        .select('id')
        .single()
      if (!err3) return String(d3?.id ?? '')
      console.error('Failed to insert notification record (fallback 3):', err3)
      return null
    }

    console.error('Failed to insert notification record (fallback 2):', err2)
    return null
  }

  // Lần 2b: related_id chưa có (PGRST204)
  if (err1.code === 'PGRST204' && err1.message?.includes('related_id')) {
    console.warn('[notification_dispatch] related_id column not found. Run migration 15.')
    const { data: d2, error: err2 } = await supabase
      .from('notifications')
      .insert({ ...baseRecord, type: payload.type })
      .select('id')
      .single()

    if (!err2) return String(d2?.id ?? '')

    // Lần 3: cả enum lẫn related_id đều vấn đề
    if (err2.code === '22P02') {
      const { data: d3, error: err3 } = await supabase
        .from('notifications')
        .insert({ ...baseRecord, type: safeNotificationType(payload.type) })
        .select('id')
        .single()
      if (!err3) return String(d3?.id ?? '')
      console.error('Failed to insert notification record (fallback 3b):', err3)
      return null
    }

    console.error('Failed to insert notification record (fallback 2b):', err2)
    return null
  }

  console.error('Failed to insert notification record:', err1)
  return null
}

export async function dispatchNotification(
  supabase: SupabaseClient,
  recipient: NotificationRecipient,
  payload: NotificationPayload
) {
  const notificationId = await insertNotificationRecord(supabase, recipient, payload)

  if (!notificationId) {
    return { persisted: false, delivered: 0 }
  }

  const tokens = await fetchRecipientTokens(supabase, recipient)

  const pushData: Record<string, string> = {
    ...payload.data,
    type: payload.type,
    notificationId,
  }

  let delivered = 0
  for (const token of tokens) {
    try {
      await sendPushNotification(token, payload.title, payload.body, pushData)
      delivered += 1
    } catch (error) {
      console.error('Push notification failed for token:', token, error)
    }
  }

  return { persisted: true, delivered }
}
