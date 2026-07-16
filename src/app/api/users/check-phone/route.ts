import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra JWT của người gọi API
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    // 2. Chỉ có super_admin hoặc manager mới được thực hiện hành động này
    if (auth.role !== 'super_admin' && auth.role !== 'manager') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400 })
    }

    // Đảm bảo số điện thoại định dạng đúng
    const formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone

    const adminSupabase = createAdminClient()

    // Tìm kiếm trong bảng users xem có trùng không, kể cả các email/phone bị thêm _del_
    const { data, error } = await adminSupabase
      .from('users')
      .select('id, full_name, email, status, phone')
      .or(`phone.eq.${formattedPhone},phone.like.${formattedPhone}_del_%`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: true, exists: false, user: null })
    }

    // Nếu status là active, ta check xem họ có đang thuê phòng nào không.
    let finalStatus = data.status
    if (data.status === 'active') {
      const { data: activeTenants } = await adminSupabase
        .from('tenants')
        .select('id')
        .eq('user_id', data.id)
        .is('move_out_date', null)

      const isRented = activeTenants && activeTenants.length > 0
      if (!isRented) {
        // Nếu không thuê phòng nào, coi như là tài khoản đã trả phòng (khách cũ), cho phép khôi phục
        finalStatus = 'deleted'
      }
    }

    // Clean email nếu có chứa _del_
    let cleanEmail = data.email
    if (cleanEmail && cleanEmail.includes('_del_')) {
      cleanEmail = cleanEmail.split('_del_')[0]
    }

    return NextResponse.json({
      success: true,
      exists: true,
      user: {
        id: data.id,
        full_name: data.full_name,
        email: cleanEmail,
        status: finalStatus,
      }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
