import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function PATCH() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', auth.dbUserId)
      .eq('is_read', false)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
