import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

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
    // include_partial=true: hiện cả phòng 'occupied' nhưng còn chỗ trống theo diện tích
    const includePartial = searchParams.get('include_partial') === 'true'

    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 10
    const offset = (page - 1) * limit

    // 1. Dùng RBAC xác thực JWT
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
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
      else if (auth.role === 'super_admin' && branchParam) {
        // Super Admin có thể lọc theo chi nhánh bất kỳ
        query = query.eq('branch_id', branchParam)
      }
    } else {
      // Unauthenticated users (Khách chưa đăng nhập) only see available rooms
      query = query.eq('status', 'available')
      if (branchParam) {
        query = query.eq('branch_id', branchParam)
      }
    }

    // Apply Filters
    if (includePartial) {
      // Khi include_partial: lấy cả available + occupied, sau đó lọc phòng còn chỗ
      query = query.in('status', ['available', 'occupied'])
    } else if (statusParam) {
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

    // Apply pagination (khi include_partial không dùng pagination server-side)
    if (!includePartial) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: rooms, error, count } = await query

    if (error) {
      throw error
    }

    // Hàm tính capacity tối đa theo diện tích phòng
    function getMaxCapacity(area: number): number {
      if (area < 16) return 1
      if (area < 24) return 2
      return 3
    }

    function getCapacityLabel(area: number, max: number): string {
      return `Tối đa ${max} người (${area}m²)`
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

    const allDocs = (rooms ?? []).map(room => {
      const tenantsList = room.tenants as unknown as TenantItem[] | undefined
      const activeTenants = tenantsList ? tenantsList.filter(t => !t.move_out_date) : []
      const activeTenant = activeTenants.length > 0 ? activeTenants[0] : null

      const tenant = activeTenant ? {
        id: activeTenant.id,
        name: activeTenant.user?.full_name || 'Khách chưa có tên',
        phone: activeTenant.user?.phone || 'Chưa cập nhật',
        check_in_date: activeTenant.move_in_date
      } : null

      // Danh sách đầy đủ tất cả cư dân đang ở (cho phòng nhiều người)
      const tenants = activeTenants.map(t => ({
        id: t.id,
        name: t.user?.full_name || 'Khách chưa có tên',
        phone: t.user?.phone || 'Chưa cập nhật',
        check_in_date: t.move_in_date
      }))

      const area = Number(room.area ?? 0)
      const maxCapacity = getMaxCapacity(area)
      const currentTenantCount = activeTenants.length
      const remainingSlots = Math.max(0, maxCapacity - currentTenantCount)

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
        tenant,
        tenants,
        // Thông tin capacity cư dân
        currentTenantCount,
        maxCapacity,
        remainingSlots,
        areaCapacityLabel: getCapacityLabel(area, maxCapacity),
      }
    })

    // Nếu include_partial: chỉ trả về phòng còn chỗ trống
    const docs = includePartial
      ? allDocs.filter(r => r.remainingSlots > 0)
      : allDocs

    return NextResponse.json({
      success: true,
      docs,
      totalDocs: includePartial ? docs.length : (count || 0),
      limit,
      page,
      totalPages: includePartial ? 1 : (count ? Math.ceil(count / limit) : 0),
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
