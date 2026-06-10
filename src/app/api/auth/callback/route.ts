import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // next is the path to redirect to after successful verification, defaults to '/'
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Xác thực thành công, chuyển hướng người dùng tới trang `next`
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Lỗi xác thực hoặc không có code
  // Trả về trang đăng nhập kèm lỗi
  const errorMsg = encodeURIComponent('Xác thực thất bại hoặc đường dẫn đã hết hạn. Vui lòng thử lại.')
  return NextResponse.redirect(`${origin}/login?message=${errorMsg}`)
}
