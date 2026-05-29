import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const supabase = auth.supabase! // Đã được auth xác thực

    // Truy vấn chi tiết ticket, kèm thông tin phòng và người báo
    const { data: ticket, error } = await supabase
      .from('maintenance_tickets')
      .select(`
        *,
        room:rooms(room_code, branch_id),
        tenant:tenants(
          user_id,
          user:users(full_name, phone)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Không tìm thấy
        return NextResponse.json({ error: 'Không tìm thấy báo hỏng' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Bảo mật dữ liệu:
    // - Khách thuê chỉ xem được ticket của mình
    if (auth.role === 'tenant') {
      if (ticket.tenant?.user_id !== auth.dbUserId) {
        return NextResponse.json({ error: 'Bạn không có quyền xem sự cố của phòng khác' }, { status: 403 })
      }
    }
    
    // - Quản lý chỉ xem được ticket thuộc chi nhánh của mình
    if (auth.role === 'manager') {
      if (ticket.room?.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không có quyền xem sự cố của chi nhánh khác' }, { status: 403 })
      }
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Xác thực (yêu cầu quyền manager hoặc super_admin)
    const auth = await verifyRole()
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    if (auth.role !== 'manager' && auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = auth.supabase!
    
    // 2. Lấy dữ liệu từ body
    const body = await request.json()
    const { status } = body

    if (!status || !['pending', 'in-progress', 'resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'Trạng thái không hợp lệ. Phải là: pending, in-progress, hoặc resolved' }, 
        { status: 400 }
      )
    }

    // 2.5 Kiểm tra quyền Manager: Chỉ cập nhật ticket thuộc chi nhánh của mình
    if (auth.role === 'manager') {
      const { data: ticketCheck } = await supabase
        .from('maintenance_tickets')
        .select(`rooms!inner(branch_id)`)
        .eq('id', id)
        .single()
      
      const ticketRoomBranchId = (ticketCheck?.rooms as unknown as { branch_id: number })?.branch_id
      if (ticketRoomBranchId !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không có quyền cập nhật sự cố của chi nhánh khác' }, { status: 403 })
      }
    }

    // 3. Cập nhật database
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ status })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      status: status
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
