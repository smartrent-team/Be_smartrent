import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole, getOrgBranchIds } from '@/lib/rbac'

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
    const offset = (page - 1) * limit

    // 1. Dùng RBAC xác thực JWT
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const supabase = auth.supabase!

    // Start building query
    let query = supabase
      .from('rooms')
      .select(`
        *,
        tenants (
          id, move_in_date, move_out_date, user:users(full_name, phone)
        )
      `, { count: 'exact' })

    // 2. Phân quyền theo Role
    if (auth.user && auth.role) {
      if (auth.role === 'tenant') {
        // Tenant không được xem danh sách tất cả phòng, chỉ nên lấy thông tin phòng của mình (Cần API riêng hoặc filter chặt ở đây)
        // Để demo, chặn luôn tenant xem list
        return NextResponse.json({ error: 'Tenant không có quyền xem danh sách phòng' }, { status: 403 })
      } 
      else if (auth.role === 'manager') {
        if (!auth.branchId) {
          return NextResponse.json({ error: 'Người dùng chưa được gán vào cơ sở nào' }, { status: 403 })
        }
        // Manager chỉ thấy phòng thuộc chi nhánh của mình
        query = query.eq('branch_id', auth.branchId)
      } 
      else if (auth.role === 'super_admin') {
        if (!auth.organizationId) {
          return NextResponse.json({ error: 'Tài khoản Super Admin chưa được gán tổ chức' }, { status: 403 })
        }
        
        // Lấy tất cả branch_id của tổ chức
        const branchIds = await getOrgBranchIds(supabase, auth.organizationId)
        if (!branchIds || branchIds.length === 0) {
          return NextResponse.json({ success: true, docs: [], totalDocs: 0, limit, page, totalPages: 0 })
        }

        if (branchParam) {
          // Đảm bảo branch_id truyền lên thuộc tổ chức của super_admin
          if (!branchIds.includes(Number(branchParam))) {
            return NextResponse.json({ error: 'Chi nhánh không thuộc tổ chức của bạn' }, { status: 403 })
          }
          query = query.eq('branch_id', branchParam)
        } else {
          // Chỉ lấy phòng thuộc các chi nhánh của org mình
          query = query.in('branch_id', branchIds)
        }
      }
    } else {
      // Unauthenticated users (Khách chưa đăng nhập) only see available rooms
      // TODO: Should unauthenticated users be able to see rooms? Need logic.
      query = query.eq('status', 'available')
      if (branchParam) {
        query = query.eq('branch_id', branchParam)
      }
    }

    // Apply Filters
    if (statusParam) {
      query = query.eq('status', statusParam)
    }
    if (searchParam) {
      query = query.ilike('room_code', `%${searchParam}%`)
    }
    if (floorParam) {
      const floorNum = parseInt(floorParam, 10)
      if (!Number.isNaN(floorNum)) {
        query = query.eq('floor', floorNum)
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: rooms, error, count } = await query

    if (error) {
      throw error
    }

    // Transform response to match legacy format if needed
    interface TenantItem {
      id: number
      move_in_date: string
      move_out_date: string | null
      user?: {
        full_name: string | null
        phone: string | null
      } | null
    }

    const docs = rooms.map(room => {
      // Pick first active tenant (where move_out_date is null)
      const tenantsList = room.tenants as unknown as TenantItem[] | undefined
      const activeTenant = tenantsList && tenantsList.length > 0 
        ? tenantsList.find(t => !t.move_out_date) 
        : null

      const tenant = activeTenant ? {
        id: activeTenant.id,
        name: activeTenant.user?.full_name || 'Khách chưa có tên',
        phone: activeTenant.user?.phone || 'Chưa cập nhật',
        check_in_date: activeTenant.move_in_date
      } : null

      return {
        id: room.id,
        roomCode: room.room_code,
        floor: room.floor,
        area: room.area,
        basePrice: room.base_price,
        electricPrice: room.electric_price,
        waterPrice: room.water_price,
        status: room.status,
        branch: room.branch_id,
        tenant
      }
    })

    return NextResponse.json({
      success: true,
      docs,
      totalDocs: count || 0,
      limit,
      page,
      totalPages: count ? Math.ceil(count / limit) : 0,
    })

  } catch (error: unknown) {
    console.error('Error fetching rooms:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
