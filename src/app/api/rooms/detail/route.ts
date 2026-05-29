import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

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

    const supabase = auth.supabase!

    // 2. Truy vấn chi tiết phòng cùng thông tin tenants, invoices, tickets liên quan
    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        *,
        tenants (
          id,
          move_in_date,
          move_out_date,
          user:users (
            id,
            full_name,
            phone
          )
        ),
        invoices (
          id,
          total_amount,
          payment_status,
          issued_at
        ),
        maintenance_tickets (
          id,
          title,
          priority,
          status,
          created_at
        )
      `)
      .eq('id', Number(roomId))
      .single()

    if (error || !room) {
      return NextResponse.json({ error: 'Không tìm thấy phòng được yêu cầu' }, { status: 404 })
    }

    // 3. Phân quyền: Manager chỉ thấy phòng thuộc chi nhánh của họ
    if (auth.role === 'manager') {
      if (!auth.branchId || room.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không có quyền truy cập thông tin phòng thuộc chi nhánh khác' }, { status: 403 })
      }
    }

    // 3.5. Phân quyền: Khách thuê chỉ xem được phòng của chính mình
    if (auth.role === 'tenant') {
      const isMyRoom = room.tenants?.some((t: any) => t.user?.id === auth.dbUserId && !t.move_out_date)
      if (!isMyRoom) {
        return NextResponse.json({ error: 'Bạn chỉ có quyền xem chi tiết phòng của chính mình' }, { status: 403 })
      }
    }

    // 4. Tìm cư dân đang hoạt động (active tenant - chưa dời đi)
    const activeTenant = room.tenants && room.tenants.length > 0
      ? room.tenants.find((t: any) => !t.move_out_date)
      : null

    const tenantInfo = activeTenant ? {
      id: activeTenant.id,
      name: activeTenant.user?.full_name || 'Khách chưa có tên',
      phone: activeTenant.user?.phone || 'Chưa cập nhật',
      checkInDate: activeTenant.move_in_date
    } : null

    // 5. Định dạng lịch sử hóa đơn
    const invoicesList = (room.invoices || []).map((inv: any) => ({
      id: inv.id,
      totalAmount: inv.total_amount,
      paymentStatus: inv.payment_status,
      issuedAt: inv.issued_at
    }))

    // 6. Định dạng lịch sử sự cố
    const ticketsList = (room.maintenance_tickets || []).map((tick: any) => ({
      id: tick.id,
      title: tick.title,
      priority: tick.priority,
      status: tick.status,
      createdAt: tick.created_at
    }))

    // 7. Trả về cấu trúc JSON data tương thích 100% với Frontend di động
    return NextResponse.json({
      success: true,
      data: {
        id: room.id,
        roomCode: room.room_code,
        floor: room.floor,
        area: room.area,
        basePrice: room.base_price,
        electricPrice: room.electric_price,
        waterPrice: room.water_price,
        status: room.status,
        tenant: tenantInfo,
        invoices: invoicesList,
        tickets: ticketsList
      }
    })

  } catch (error: unknown) {
    console.error('Error fetching room detail:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
