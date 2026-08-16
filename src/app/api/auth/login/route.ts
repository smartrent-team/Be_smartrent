import { NextResponse, type NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { formatZodError } from '@/lib/validations'

/** Map các error message tiếng Anh từ Supabase Auth sang tiếng Việt */
function mapSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Số điện thoại hoặc mật khẩu không đúng.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Tài khoản chưa được xác nhận. Vui lòng kiểm tra email.'
  }
  if (lower.includes('user not found')) {
    return 'Tài khoản không tồn tại trong hệ thống.'
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Quá nhiều lần thử. Vui lòng đợi vài phút rồi thử lại.'
  }
  if (lower.includes('user is disabled') || lower.includes('account is disabled')) {
    return 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Không thể kết nối. Vui lòng thử lại.'
  }
  // Fallback: trả về message gốc không chứa thông tin kỹ thuật nhạy cảm
  return 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'
}

const loginSchema = z.object({
  phone: z.string().min(1, 'Vui lòng nhập số điện thoại hoặc email'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
})

const LOCKED_ACCOUNT_MESSAGE = 'Tài khoản này đã bị khóa.'

function isLockedAccountStatus(status?: string | null): boolean {
  return status === 'locked' || status === 'blocked'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { phone, password } = parsed.data

    const supabase = await createApiClient()
    const adminSupabase = await import('@/lib/supabase/admin').then(m => m.createAdminClient())
    
    let targetEmail: string
    let userRecordByIdentity: { email: string | null; status: string | null } | null = null
    if (phone.includes('@')) {
      // Đăng nhập bằng Email trực tiếp
      targetEmail = phone

      const { data: userRecord } = await adminSupabase
        .from('users')
        .select('email, status')
        .eq('email', targetEmail)
        .maybeSingle()

      userRecordByIdentity = userRecord
    } else {
      // Đăng nhập bằng số điện thoại
      // Do Supabase không cho phép đăng nhập trực tiếp bằng SĐT, ta cần lấy email tương ứng từ DB
      let localPhone = phone
      if (phone.startsWith('0')) localPhone = `+84${phone.slice(1)}`
      else if (!phone.startsWith('+')) localPhone = `+84${phone}`

      const { data: userRecord } = await adminSupabase
        .from('users')
        .select('email, status')
        .eq('phone', localPhone)
        .maybeSingle()

      userRecordByIdentity = userRecord
      
      if (userRecord && userRecord.email) {
        targetEmail = userRecord.email
      } else {
        // Fallback email cho các tài khoản cũ chưa có email thật
        targetEmail = `${localPhone.replace('+', '')}@user.local`
      }
    }

    if (isLockedAccountStatus(userRecordByIdentity?.status)) {
      return NextResponse.json({ error: LOCKED_ACCOUNT_MESSAGE }, { status: 403 })
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    })

    if (error) {
      const viMessage = mapSupabaseAuthError(error.message)
      return NextResponse.json({ error: viMessage }, { status: 401 })
    }

    // Lấy thêm profile bằng email để mobile app biết role
    const { data: profile } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', targetEmail)
      .single()

    if (isLockedAccountStatus(profile?.status)) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: LOCKED_ACCOUNT_MESSAGE }, { status: 403 })
    }

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
