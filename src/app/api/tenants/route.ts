import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { formatVietnamDateDisplay } from '@/lib/date-utils'

export async function GET() {
  try {
    // 1. Xác thực JWT của người dùng qua RBAC
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
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
        user:users!inner(
          id,
          full_name,
          phone,
          role,
          branch_id
        )
      `)
      .eq('user.status', 'active')

    // 3. Phân quyền: Chặn Khách thuê xem danh sách toàn bộ cư dân
    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Khách thuê không có quyền xem danh sách cư dân' }, { status: 403 })
    }

    // 4. Phân quyền: Manager chỉ thấy cư dân thuộc chi nhánh của họ
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

    interface TenantRecord {
      id: number;
      room_id: number;
      move_in_date: string;
      move_out_date: string | null;
      rooms: { id: number; room_code: string; branch_id: number } | null;
      user: { id: number; full_name: string; phone: string; role: string; email: string } | null;
    }

    // 4. Trả về định dạng JSON docs tương thích với ứng dụng di động Flutter
    const docs = ((tenantsData || []) as unknown as TenantRecord[])
      .filter(t => t.user !== null) // Loại bỏ các bản ghi không có user hợp lệ
      .map(t => {
        const fullName = t.user?.full_name || 'Không tên';
        // Lấy chữ cái đầu tiên của Tên cuối cùng làm initial đại diện
        const nameParts = fullName.trim().split(' ');
        const initial = nameParts.length > 0 ? nameParts[nameParts.length - 1][0].toUpperCase() : 'C';
        
        return {
          id: t.id,
          name: fullName,
          phone: t.user?.phone || 'Chưa cập nhật',
          checkInDate: formatVietnamDateDisplay(t.move_in_date) ?? 'Chưa cập nhật',
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
