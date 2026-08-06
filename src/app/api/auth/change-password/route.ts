import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { new_password } = body

    if (!new_password || new_password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    // Vì createApiClient() cho Mobile App chỉ truyền Authorization header mà không set auth session
    // Hàm updateUser() mặc định sẽ báo lỗi "Auth session missing!".
    // Khi đã đi qua verifyRole() tức là JWT đã hợp lệ, ta có thể an toàn dùng Admin Client để đổi pass
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(auth.user!.id, {
      password: new_password
    })

    if (error) {
      return NextResponse.json({ error: 'Không thể đổi mật khẩu. Vui lòng thử lại.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công' })
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Lỗi máy chủ. Vui lòng thử lại sau.' }, { status: 500 })
  }
}
