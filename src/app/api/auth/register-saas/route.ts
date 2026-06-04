import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { formatZodError } from '@/lib/validations'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  orgName: z.string().min(2, 'Tên tổ chức phải có ít nhất 2 ký tự'),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { fullName, email, password, orgName, phone } = parsed.data
    const adminSupabase = createAdminClient()

    // 1. Kiểm tra xem email hoặc SĐT đã tồn tại chưa trong public.users
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('id, email')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'Email hoặc Số điện thoại đã được đăng ký' }, { status: 400 })
    }

    // 2. Tạo Organization mới
    const { data: orgData, error: orgError } = await adminSupabase
      .from('organizations')
      .insert({
        name: orgName,
        contact_email: email,
        contact_phone: phone,
      })
      .select('id')
      .single()

    if (orgError || !orgData) {
      return NextResponse.json({ error: 'Không thể tạo tổ chức: ' + orgError?.message }, { status: 500 })
    }

    // 3. Tạo Auth User trong Supabase (để login)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
      }
    })

    if (authError) {
      // Rollback org nếu tạo auth lỗi
      await adminSupabase.from('organizations').delete().eq('id', orgData.id)
      return NextResponse.json({ error: 'Lỗi tạo tài khoản Auth: ' + authError.message }, { status: 500 })
    }

    // 4. Lưu User vào public.users với role Super Admin và map tới org vừa tạo
    const { error: userError } = await adminSupabase
      .from('users')
      .insert({
        email,
        full_name: fullName,
        phone,
        role: 'super_admin',
        organization_id: orgData.id,
      })

    if (userError) {
      // Rollback nếu có lỗi
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      await adminSupabase.from('organizations').delete().eq('id', orgData.id)
      return NextResponse.json({ error: 'Lỗi lưu thông tin người dùng: ' + userError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng ký thành công',
      organization_id: orgData.id
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
