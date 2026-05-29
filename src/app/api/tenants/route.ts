import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    // 1. Xác thực JWT của người dùng qua RBAC
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!

    // 2. Xây dựng câu truy vấn bảng tenants kết nối bảng users và rooms
    let query = supabase
      .from('tenants')
      .select(`
        id,
        move_in_date,
        move_out_date,
        room:rooms!inner(
          room_code,
          branch_id
        ),
        user:users(
          id,
          full_name,
          phone,
          role,
          branch_id
        )
      `)

    // 3. Phân quyền: Manager chỉ thấy cư dân thuộc chi nhánh của họ
    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Tài khoản Manager chưa được gán chi nhánh' }, { status: 403 })
      }
      query = query.eq('rooms.branch_id', auth.branchId)
    }

    const { data: tenantsData, error } = await query

    if (error) {
      throw error
    }

    // 4. Trả về định dạng JSON docs tương thích với ứng dụng di động Flutter
    const docs = (tenantsData || [])
      .filter((t: any) => t.user !== null) // Loại bỏ các bản ghi không có user hợp lệ
      .map((t: any) => {
        const fullName = t.user?.full_name || 'Không tên';
        // Lấy chữ cái đầu tiên của Tên cuối cùng làm initial đại diện
        const nameParts = fullName.trim().split(' ');
        const initial = nameParts.length > 0 ? nameParts[nameParts.length - 1][0].toUpperCase() : 'C';
        
        return {
          id: t.id,
          name: fullName,
          phone: t.user?.phone || 'Chưa cập nhật',
          checkInDate: t.move_in_date ? new Date(t.move_in_date).toLocaleDateString('vi-VN') : 'Chưa cập nhật',
          isRoomHead: t.user?.role === 'owner',
          initial: initial,
        }
      })

    return NextResponse.json({
      success: true,
      docs
    })

  } catch (error: unknown) {
    console.error('Error fetching tenants list:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
