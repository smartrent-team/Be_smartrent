import { NextResponse, type NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { phoneSchema, formatZodError } from '@/lib/validations'

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { phone, password } = parsed.data

    // Đảm bảo số điện thoại bắt đầu bằng mã quốc gia, ví dụ +84
    const formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone

    const supabase = await createApiClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      phone: formattedPhone,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // Lấy thêm profile để mobile app biết role
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({
      success: true,
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: {
        id: data.user.id,
        phone: data.user.phone,
        role: profile?.role,
        branch_id: profile?.branch_id,
        full_name: profile?.full_name
      }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
