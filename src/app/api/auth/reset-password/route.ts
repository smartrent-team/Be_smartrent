import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/reset-password
 *
 * Hỗ trợ 2 flow:
 *
 * 1. OTP flow (token_hash) — Supabase Auth settings: "Use OTP" / link type = "magic link"
 *    Body: { token_hash: string, password: string }
 *
 * 2. PKCE flow (code) — phải exchange bằng server client (không phải admin client)
 *    Body: { code: string, password: string }
 *
 * Khuyến nghị dùng token_hash (OTP flow) vì PKCE code chỉ valid một lần
 * và phải được exchange từ server có code_verifier tương ứng.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, token_hash, password } = body

    console.log('[reset-password] body keys:', Object.keys(body))

    if (!code && !token_hash) {
      return NextResponse.json({ error: 'Thiếu code hoặc token_hash' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    let userId: string | undefined

    if (token_hash) {
      // OTP flow — dùng admin client, verifyOtp với token_hash
      const supabase = createAdminClient()
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })
      console.log('[reset-password] verifyOtp error:', error?.message ?? 'none')
      if (error || !data.user) {
        return NextResponse.json(
          { error: 'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email.' },
          { status: 400 }
        )
      }
      userId = data.user.id
    } else {
      // PKCE flow — dùng server client (có cookie context, không dùng admin)
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      console.log('[reset-password] exchangeCode error:', error?.message ?? 'none')
      if (error || !data.user) {
        return NextResponse.json(
          { error: 'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email.' },
          { status: 400 }
        )
      }
      userId = data.user.id
    }

    // Cập nhật mật khẩu bằng admin client
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password }
    )
    console.log('[reset-password] updateUser error:', updateError?.message ?? 'none')

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
