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

export async function dispatchNotification(
  supabase: SupabaseClient,
  recipient: NotificationRecipient,
  payload: NotificationPayload
) {
  const { data: inserted, error: insertError } = await supabase.from('notifications').insert({
    user_id: recipient.userId,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    related_id: payload.relatedId ?? null,
    is_read: false,
    updated_at: new Date().toISOString(),
  }).select('id').single()

  let notificationId = ''
  if (insertError) {
    console.error('Failed to insert notification record:', insertError)
  } else if (inserted) {
    notificationId = String(inserted.id)
  }

  const tokens = await fetchRecipientTokens(supabase, recipient)

  const pushData = {
    ...payload.data,
    type: payload.type,
    ...(notificationId ? { notificationId } : {})
  }

  for (const token of tokens) {
    try {
      await sendPushNotification(token, payload.title, payload.body, pushData)
    } catch (error) {
      console.error('Push notification failed:', error)
    }
  }
}
