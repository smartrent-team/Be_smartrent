import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { checkAuthRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra Rate Limiting (chống Spam Gửi Email)
    const { success } = await checkAuthRateLimit(request, 'forgot-password')
    if (!success) {
      return NextResponse.json({ error: 'Bạn đã yêu cầu gửi email quá nhiều lần. Vui lòng đợi 1 phút.' }, { status: 429 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 })
    }

    const supabase = await createClient()
    const headersList = await headers()
    
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = `${protocol}://${host}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password?source=mobile_app`,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn.' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
