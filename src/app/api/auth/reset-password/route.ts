import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/auth/reset-password
 *
 * Body: { access_token: string, password: string }
 *
 * access_token được lấy từ trang /auth/mobile-redirect sau khi
 * exchange PKCE code → session. App nhận qua deep link và gửi lên đây.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, password } = body

    if (!access_token) {
      return NextResponse.json({ error: 'Thiếu access_token' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Lấy user từ access_token
    const { data: userData, error: userError } = await supabase.auth.getUser(access_token)

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email.' },
        { status: 400 }
      )
    }

    // Cập nhật mật khẩu mới
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.user.id,
      { password }
    )

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công' })
  } catch (error: unknown) {
    console.error('[reset-password] unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
