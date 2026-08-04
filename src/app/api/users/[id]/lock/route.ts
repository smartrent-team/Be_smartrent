import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền thực hiện thao tác này' }, { status: 403 })
    }

    const { id } = await params
    const targetUserId = id.trim()
    if (!targetUserId) {
      return NextResponse.json({ error: 'ID người dùng không hợp lệ' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Khóa bởi quản lý'
    const lockAction = body.isLocked !== false // mặc định là lock

    const supabase = auth.supabase!

    // Cập nhật trạng thái người dùng
    const { error: updateError } = await supabase
      .from('users')
      .update({
        status: lockAction ? 'locked' : 'active',
      })
      .eq('id', targetUserId)

    if (updateError) {
      return NextResponse.json({ error: 'Không thể cập nhật trạng thái tài khoản', details: updateError.message }, { status: 400 })
    }

    // Gửi thông báo đến tài khoản bị khóa/mở khóa
    try {
      const { dispatchNotification } = await import('@/lib/notification_dispatch')
      await dispatchNotification(
        supabase,
        { userId: targetUserId },
        {
          title: lockAction ? 'Tài khoản đã bị khóa' : 'Tài khoản đã mở khóa',
          body: lockAction
            ? `Tài khoản của bạn đã bị khóa. Lý do: ${reason}`
            : 'Tài khoản của bạn đã được mở khóa hoạt động bình thường.',
          type: 'system',
        }
      )
    } catch (notifErr) {
      console.warn('Không thể gửi thông báo tới user khóa:', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: lockAction
        ? `Đã khóa tài khoản thành công. Lý do: ${reason}`
        : 'Đã mở khóa tài khoản thành công',
      data: {
        userId: targetUserId,
        status: lockAction ? 'locked' : 'active',
        reason,
      },
    })
  } catch (error: unknown) {
    console.error('Lỗi khi khóa/mở khóa tài khoản:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ', details: msg }, { status: 500 })
  }
}
