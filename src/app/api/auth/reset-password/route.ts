import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/auth/reset-password
 * Nhận token recovery từ mobile app và đặt mật khẩu mới.
 *
 * Body: { token: string, password: string }
 *
 * Luồng:
 *  1. Mobile nhận deep link: smartrent://reset-password?token=xxx&type=recovery
 *  2. DeepLinkService parse token, mở ResetPasswordPage
 *  3. User nhập mật khẩu mới → gọi API này
 *  4. API dùng admin client verifyOtp để xác thực token rồi updateUser
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Xác thực OTP token recovery
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    })

    if (verifyError || !verifyData.user) {
      return NextResponse.json(
        { error: 'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email khôi phục.' },
        { status: 400 }
      )
    }

    // Cập nhật mật khẩu mới
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      verifyData.user.id,
      { password }
    )

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
