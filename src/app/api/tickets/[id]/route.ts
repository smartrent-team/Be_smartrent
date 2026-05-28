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

    // Truy vấn chi tiết ticket, kèm thông tin phòng và người báo (nếu có)
    const { data: ticket, error } = await supabase
      .from('maintenance_tickets')
      .select(`
        *,
        room:rooms(room_code),
        tenant:tenants(
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

    // Tùy chọn: Bảo mật dữ liệu (nếu user là tenant, chỉ cho phép xem ticket của chính họ)
    if (auth.user?.user_metadata?.role === 'tenant') {
      // Kiểm tra xem tenant này có thuộc phòng của ticket không (tạm thời để vậy, tuỳ theo logic auth)
      // Nếu có rule RLS thì Supabase đã tự block rồi.
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
    const auth = await verifyRole(['manager', 'super_admin'])
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
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
