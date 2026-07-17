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

    // generateLink đã tự gửi email với link trỏ về redirectTo
    // (trang /auth/mobile-redirect sẽ redirect sang deep link smartrent://)
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
