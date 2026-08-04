import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

// PATCH /api/rooms/:id  — cập nhật thông tin phòng (manager + super_admin)
// Hiện tại hỗ trợ cập nhật vehicle_count (và các trường khác nếu cần mở rộng sau)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const roomId = parseInt(id, 10)

    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'ID phòng không hợp lệ' }, { status: 400 })
    }

    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền chỉnh sửa phòng' }, { status: 403 })
    }

    const supabase = auth.supabase!

    // Kiểm tra phòng có thuộc chi nhánh của manager không
    if (auth.role === 'manager') {
      const { data: room } = await supabase
        .from('rooms')
        .select('branch_id')
        .eq('id', roomId)
        .single()

      if (!room || room.branch_id !== auth.branchId) {
        return NextResponse.json(
          { error: 'Không có quyền chỉnh sửa phòng thuộc chi nhánh khác' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Chỉ cập nhật các trường được gửi lên
    if (body.vehicleCount !== undefined) {
      const count = parseInt(body.vehicleCount, 10)
      if (isNaN(count) || count < 0) {
        return NextResponse.json({ error: 'Số lượng xe không hợp lệ' }, { status: 400 })
      }
      updates.vehicle_count = count
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Không có trường nào được cập nhật' }, { status: 400 })
    }

    const { error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', roomId)

    if (error) {
      console.error('Error updating room:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Cập nhật phòng thành công' })

  } catch (error: unknown) {
    console.error('Error in PATCH /api/rooms/[id]:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
