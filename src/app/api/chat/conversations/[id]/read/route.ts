import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { isConversationParticipant, type ConversationRow } from '@/lib/chat'

export const dynamic = 'force-dynamic'

export async function PATCH(
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

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (conversationError) throw conversationError
    if (!conversation) {
      return NextResponse.json({ error: 'Không tìm thấy cuộc trò chuyện' }, { status: 404 })
    }

    const allowed = await isConversationParticipant(
      supabase,
      conversation as ConversationRow,
      auth.dbUserId
    )
    if (!allowed) {
      return NextResponse.json({ error: 'Bạn không có quyền cập nhật cuộc trò chuyện này' }, { status: 403 })
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .eq('receiver_id', auth.dbUserId)
      .eq('is_read', false)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Đã đánh dấu tin nhắn là đã đọc' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
