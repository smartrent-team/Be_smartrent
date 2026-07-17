import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getPublicAppUrl } from '@/lib/public-url'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 })
    }

    const origin = await getPublicAppUrl()

    // Dùng implicit flow (không PKCE) để Supabase gửi link dạng:
    // /auth/mobile-redirect#access_token=xxx&type=recovery
    // thay vì PKCE ?code=xxx (cần code_verifier trên cùng browser)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { flowType: 'implicit' },
        cookies: { getAll: () => [], setAll: () => {} },
      }
    )

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/mobile-redirect`,
    })

    if (error) {
      console.error('[forgot-password] error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

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
