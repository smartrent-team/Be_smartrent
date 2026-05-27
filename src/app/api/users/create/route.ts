import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole, canCreateUser } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra JWT của người gọi API
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const body = await request.json()
    const { phone, password, full_name, role: targetRole, branch_id: targetBranchId } = body

    if (!phone || !password || !targetRole) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (phone, password, role)' }, { status: 400 })
    }

    // 2. Kiểm tra RBAC (Phân quyền)
    if (!canCreateUser(auth.role, targetRole)) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo tài khoản với vai trò này' }, { status: 403 })
    }

    if (targetRole === 'manager' || targetRole === 'tenant') {
      if (!targetBranchId) {
        return NextResponse.json({ error: `Vai trò ${targetRole} yêu cầu bắt buộc phải chọn chi nhánh` }, { status: 400 })
      }
    }

    let finalBranchId = targetBranchId
    
    // Nếu là Manager, ép buộc branch_id phải là branch của Manager, không được tạo user cho chi nhánh khác
    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Tài khoản Manager của bạn chưa được gán chi nhánh' }, { status: 403 })
      }
      finalBranchId = auth.branchId
    }

    // Đảm bảo số điện thoại định dạng đúng
    const formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone
    const dummyEmail = `${formattedPhone.replace('+', '')}@user.local`

    // 3. Khởi tạo Admin Client để tạo user bỏ qua OTP SMS
    const adminSupabase = createAdminClient()

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: dummyEmail,
      email_confirm: true,
      phone: formattedPhone,
      password,
      phone_confirm: true, // Ép buộc xác thực SĐT để khách có thể đăng nhập ngay không cần OTP
      user_metadata: {
        full_name
      }
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Không thể tạo Auth User' }, { status: 400 })
    }

    // 4. Lưu thông tin phụ vào bảng public.users (để cột id tự động sinh số nguyên integer)
    const { error: dbError } = await adminSupabase
      .from('users')
      .insert({
        full_name,
        phone: formattedPhone,
        role: targetRole,
        branch_id: finalBranchId || null,
        email: dummyEmail
      })

    if (dbError) {
      // Rollback (Xóa auth user nếu chèn DB thất bại)
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Lỗi khi ghi dữ liệu profile: ' + dbError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tạo tài khoản thành công',
      user: {
        id: authData.user.id,
        phone: formattedPhone,
        role: targetRole,
        branch_id: finalBranchId || null
      }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
