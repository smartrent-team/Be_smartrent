import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/auth/reset-password
 * Nhận token recovery hoặc PKCE code từ mobile app và đặt mật khẩu mới.
 *
 * Body:
 *  - { code: string, password: string }      — PKCE flow (Supabase gửi ?code=xxx)
 *  - { token_hash: string, password: string } — OTP flow  (Supabase gửi ?token_hash=xxx)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, token_hash, password } = body

    if (!code && !token_hash) {
      return NextResponse.json({ error: 'Thiếu code hoặc token_hash' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    const supabase = createAdminClient()
    let userId: string | undefined

    if (code) {
      // PKCE flow: exchange code → session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error || !data.user) {
        return NextResponse.json(
          { error: 'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email.' },
          { status: 400 }
        )
      }
      userId = data.user.id
    } else {
      // OTP flow: verify token_hash
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })
      if (error || !data.user) {
        return NextResponse.json(
          { error: 'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email.' },
          { status: 400 }
        )
      }
      userId = data.user.id
    }

    // Cập nhật mật khẩu mới
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password })
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công' })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
