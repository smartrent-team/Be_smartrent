import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { changeTenantRoom } from '@/lib/tenant-room-operations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền đổi phòng' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const newRoomIdRaw = body.newRoomId ?? body.roomId
    const newRoomId =
      typeof newRoomIdRaw === 'number'
        ? newRoomIdRaw
        : parseInt(String(newRoomIdRaw), 10)

    if (!Number.isFinite(newRoomId)) {
      return NextResponse.json({ error: 'Vui lòng chọn phòng mới' }, { status: 400 })
    }

    const result = await changeTenantRoom(auth.supabase!, tenantId, newRoomId, {
      role: auth.role,
      branchId: auth.branchId ?? null,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Đã đổi phòng thành công',
      data: {
        oldRoomId: result.oldRoomId,
        newRoomId: result.newRoomId,
      },
    })
  } catch (error: unknown) {
    console.error('Error changing tenant room:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
