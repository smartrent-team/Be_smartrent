import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { isConversationParticipant, type ConversationRow } from '@/lib/chat'
import { createMessageSchema, formatZodError } from '@/lib/validations'
import { dispatchNotification } from '@/lib/notification_dispatch'

export const dynamic = 'force-dynamic'

async function getConversation(
  supabase: NonNullable<Awaited<ReturnType<typeof verifyRole>>['supabase']>,
  conversationId: string
) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()

  if (error) throw error
  return data as ConversationRow | null
}

function resolveReceiverId(
  conversation: ConversationRow,
  senderId: string
): string | null {
  if (conversation.type === 'PRODUCT') {
    if (conversation.buyer_id === senderId) return conversation.seller_id
    if (conversation.seller_id === senderId) return conversation.buyer_id
    return null
  }

  return conversation.manager_id === senderId ? null : conversation.manager_id
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const { id } = await params
    const supabase = auth.supabase!
    const conversation = await getConversation(supabase, id)

    if (!conversation) {
      return NextResponse.json({ error: 'Không tìm thấy cuộc trò chuyện' }, { status: 404 })
    }

    const allowed = await isConversationParticipant(supabase, conversation, auth.dbUserId)
    if (!allowed) {
      return NextResponse.json({ error: 'Bạn không có quyền xem cuộc trò chuyện này' }, { status: 403 })
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, receiver_id, content, is_read, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: messages ?? [] })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => null)
    const parsed = createMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const supabase = auth.supabase!
    const conversation = await getConversation(supabase, id)

    if (!conversation) {
      return NextResponse.json({ error: 'Không tìm thấy cuộc trò chuyện' }, { status: 404 })
    }

    const allowed = await isConversationParticipant(supabase, conversation, auth.dbUserId)
    if (!allowed) {
      return NextResponse.json({ error: 'Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này' }, { status: 403 })
    }

    let receiverId = resolveReceiverId(conversation, auth.dbUserId)

    if (!receiverId && conversation.type === 'MANAGER') {
      if (conversation.tenant_id != null) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('user_id')
          .eq('id', conversation.tenant_id)
          .maybeSingle()
        receiverId = tenant?.user_id ?? null
      }
    }

    if (!receiverId) {
      return NextResponse.json({ error: 'Không xác định được người nhận' }, { status: 400 })
    }

    const content = parsed.data.content.trim()
    const now = new Date().toISOString()

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: auth.dbUserId,
        receiver_id: receiverId,
        content,
        is_read: false,
      })
      .select('id, conversation_id, sender_id, receiver_id, content, is_read, created_at')
      .single()

    if (messageError) throw messageError

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', id)

    if (updateError) throw updateError

    const senderName =
      auth.user.user_metadata?.full_name ||
      auth.user.email?.split('@')[0] ||
      'Người dùng'

    await dispatchNotification(
      supabase,
      { userId: receiverId },
      {
        title: 'Tin nhắn mới',
        body: `${senderName}: ${content.slice(0, 120)}`,
        type: 'chat_message',
        relatedId: id,
        data: { conversationId: id },
      }
    )

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
