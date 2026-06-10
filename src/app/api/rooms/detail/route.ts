import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { RoomService } from '@/services/room.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('id')

    if (!roomId) {
      return NextResponse.json({ error: 'Thiếu ID phòng (parameter id)' }, { status: 400 })
    }

    // 1. Xác thực người gọi API qua RBAC
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    // 2. Delegate toàn bộ business logic sang Service
    const data = await RoomService.getRoomDetail({
      supabase: auth.supabase!,
      roomId: Number(roomId),
      role: auth.role,
      authBranchId: auth.branchId,
      organizationId: auth.organizationId,
      dbUserId: auth.dbUserId!
    })

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error: unknown) {
    console.error('Error fetching room detail:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('quyền truy cập') || errorMessage.includes('chưa được gán') || errorMessage.includes('thuộc tổ chức')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 })
    }
    if (errorMessage.includes('Không tìm thấy')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}

