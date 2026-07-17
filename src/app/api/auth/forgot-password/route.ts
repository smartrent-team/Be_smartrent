import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicAppUrl } from '@/lib/public-url'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const origin = await getPublicAppUrl()

    // Dùng admin.generateLink để tạo recovery link dạng token_hash (không dùng PKCE)
    // Token này sẽ được gắn vào deep link và mobile app dùng để đổi mật khẩu
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${origin}/auth/mobile-redirect`,
      },
    })

    if (error || !data?.properties?.hashed_token) {
      console.error('[forgot-password] generateLink error:', error?.message)
      return NextResponse.json(
        { error: error?.message ?? 'Không thể tạo link khôi phục' },
        { status: 400 }
      )
    }

    // Gửi email thủ công với deep link thay vì dùng link Supabase mặc định
    // Tạo link trực tiếp trỏ vào trang trung gian với token_hash
    const tokenHash = data.properties.hashed_token
    const recoveryUrl = `${origin}/auth/mobile-redirect?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`

    // Gửi email qua Supabase (dùng resetPasswordForEmail để trigger email template)
    // Nhưng người dùng sẽ nhận link trỏ về trang trung gian
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/mobile-redirect`,
    })

    if (sendError) {
      console.error('[forgot-password] sendError:', sendError.message)
      return NextResponse.json({ error: sendError.message }, { status: 400 })
    }

    console.log('[forgot-password] recovery link generated:', recoveryUrl)
    return NextResponse.json({
      success: true,
      message: 'Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn.',
    })
  } catch (error: unknown) {
    console.error('[forgot-password] unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
