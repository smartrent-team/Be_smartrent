import type { SupabaseClient } from '@supabase/supabase-js'

export type ConversationType = 'PRODUCT' | 'MANAGER'

export type ConversationRow = {
  id: string
  type: ConversationType
  product_id: number | null
  tenant_id: number | null
  manager_id: string | null
  seller_id: string | null
  buyer_id: string | null
  last_message: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

type UserProfile = {
  id: string
  full_name: string | null
  phone: string | null
  role: string | null
}

export async function getTenantIdByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('user_id', userId)
    .is('move_out_date', null)
    .maybeSingle()

  return data?.id ?? null
}

export async function isConversationParticipant(
  supabase: SupabaseClient,
  conversation: ConversationRow,
  userId: string
): Promise<boolean> {
  if (
    conversation.buyer_id === userId ||
    conversation.seller_id === userId ||
    conversation.manager_id === userId
  ) {
    return true
  }

  if (conversation.tenant_id != null) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('user_id')
      .eq('id', conversation.tenant_id)
      .maybeSingle()

    if (tenant?.user_id === userId) return true
  }

  return false
}

export function buildConversationFilter(
  userId: string,
  role: string,
  tenantId: number | null
): string {
  const parts = [
    `buyer_id.eq.${userId}`,
    `seller_id.eq.${userId}`,
    `manager_id.eq.${userId}`,
  ]

  if (tenantId != null) {
    parts.push(`tenant_id.eq.${tenantId}`)
  }

  if (role === 'super_admin') {
    parts.push('type.eq.MANAGER')
  }

  return parts.join(',')
}

export async function resolveOtherParty(
  supabase: SupabaseClient,
  conversation: ConversationRow,
  currentUserId: string
): Promise<UserProfile | null> {
  let otherUserId: string | null = null

  if (conversation.type === 'PRODUCT') {
    otherUserId =
      conversation.buyer_id === currentUserId
        ? conversation.seller_id
        : conversation.buyer_id
  } else if (conversation.type === 'MANAGER') {
    if (conversation.manager_id === currentUserId) {
      if (conversation.tenant_id != null) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('user_id')
          .eq('id', conversation.tenant_id)
          .maybeSingle()
        otherUserId = tenant?.user_id ?? null
      }
    } else {
      otherUserId = conversation.manager_id
    }
  }

  if (!otherUserId) return null

  const { data } = await supabase
    .from('users')
    .select('id, full_name, phone, role')
    .eq('id', otherUserId)
    .maybeSingle()

  return data as UserProfile | null
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', userId)
    .eq('is_read', false)

  return count ?? 0
}
