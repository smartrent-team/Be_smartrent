import { NextResponse, type NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { phoneSchema, formatZodError } from '@/lib/validations'

const loginSchema = z.object({
  phone: z.string().min(1, 'Vui lòng nhập số điện thoại hoặc email'),
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

    let targetEmail: string

    if (phone.includes('@')) {
      // Đăng nhập bằng Email trực tiếp (dành cho Super Admin)
      targetEmail = phone
    } else {
      // Đăng nhập bằng số điện thoại (dành cho Manager/Tenant)
      const formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone
      targetEmail = `${formattedPhone.replace('+', '')}@user.local`
    }

    const supabase = await createApiClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // Lấy thêm profile bằng email để mobile app biết role
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('email', targetEmail)
      .single()

    return NextResponse.json({
      success: true,
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: {
        id: data.user.id,
        phone: profile?.phone || data.user.phone,
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
