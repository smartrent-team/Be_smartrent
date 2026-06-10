import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { RoomService } from '@/services/room.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query params
    const statusParam = searchParams.get('status')
    const branchParam = searchParams.get('branch_id')
    const searchParam = searchParams.get('search')
    const floorParam = searchParams.get('floor')
    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = parseInt(searchParams.get('limit') || '10', 10)

    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 10

    // 1. Dùng RBAC xác thực JWT
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    // 2. Gọi Service để xử lý logic tìm kiếm, phân quyền và dữ liệu
    const result = await RoomService.getRoomsList({
      supabase: auth.supabase!,
      role: auth.role,
      authBranchId: auth.branchId,
      organizationId: auth.organizationId,
      options: {
        status: statusParam,
        branchId: branchParam ? Number(branchParam) : null,
        search: searchParam,
        floor: floorParam ? Number(floorParam) : null,
        page,
        limit
      }
    })

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error: unknown) {
    console.error('Error fetching rooms:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('không có quyền') || errorMessage.includes('chưa được gán') || errorMessage.includes('không thuộc tổ chức')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}

