import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomIdParam = searchParams.get('id')

    if (!roomIdParam) {
      return NextResponse.json({ error: 'Thiếu mã phòng (id)' }, { status: 400 })
    }

    const roomId = parseInt(roomIdParam, 10)
    if (Number.isNaN(roomId)) {
      return NextResponse.json({ error: 'Mã phòng không hợp lệ' }, { status: 400 })
    }

    // 1. Dùng RBAC xác thực JWT
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const supabase = auth.supabase!

    // Query room detail along with relations
    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        *,
        tenants (
          id, user_id, move_in_date, move_out_date, user:users(full_name, phone)
        ),
        invoices (
          id, invoice_code, total_amount, payment_status, issued_at
        ),
        maintenance_tickets (
          id, title, status, created_at, priority
        )
      `)
      .eq('id', roomId)
      .single()

    if (error || !room) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin phòng' }, { status: 404 })
    }

    // 2. Phân quyền theo Role
    if (auth.role === 'manager') {
      if (!auth.branchId || room.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không có quyền truy cập thông tin phòng thuộc chi nhánh khác' }, { status: 403 })
      }
    } else if (auth.role === 'tenant') {
      // Check if this user is an active tenant in this room
      const activeTenant = (room.tenants as any[])?.find(
        (t) => !t.move_out_date && t.user_id === auth.user?.id
      )
      if (!activeTenant) {
        return NextResponse.json({ error: 'Bạn không có quyền truy cập thông tin phòng này' }, { status: 403 })
      }
    }

    // Transform response
    // Get active tenant if exists
    const activeTenant = (room.tenants as any[])?.find((t) => !t.move_out_date) || null
    const tenant = activeTenant ? {
      id: activeTenant.id,
      name: activeTenant.user?.full_name || 'Khách chưa có tên',
      phone: activeTenant.user?.phone || 'Chưa cập nhật',
      checkInDate: activeTenant.move_in_date
    } : null

    const data = {
      id: room.id,
      roomCode: room.room_code,
      floor: room.floor,
      area: room.area,
      basePrice: room.base_price,
      electricPrice: room.electric_price,
      waterPrice: room.water_price,
      status: room.status,
      tenant,
      invoices: (room.invoices as any[])?.map(inv => ({
        id: inv.id,
        invoiceCode: inv.invoice_code,
        totalAmount: inv.total_amount,
        paymentStatus: inv.payment_status,
        issuedAt: inv.issued_at
      })) || [],
      tickets: (room.maintenance_tickets as any[])?.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        createdAt: ticket.created_at,
        priority: ticket.priority
      })) || []
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error: unknown) {
    console.error('Error fetching room details:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
