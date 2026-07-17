import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicAppUrl } from '@/lib/public-url'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 })
    }

    const origin = await getPublicAppUrl()

    // Dùng @supabase/supabase-js thuần (không phải @supabase/ssr)
    // để set flowType: 'implicit' — @supabase/ssr luôn force PKCE và không cho override.
    // Implicit flow gửi link dạng: /auth/mobile-redirect#access_token=xxx&type=recovery
    // Browser đọc hash fragment trực tiếp, không cần exchange.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit' } }
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
