import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { formatZodError } from '@/lib/validations'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  orgName: z.string().min(2, 'Tên tổ chức phải có ít nhất 2 ký tự'),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ')
})

// Khởi tạo Rate Limiter nếu có cấu hình Upstash
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

let ratelimit: Ratelimit | null = null
if (redisUrl && redisToken) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: redisUrl,
      token: redisToken,
    }),
    limiter: Ratelimit.slidingWindow(3, '1 h'), // Giới hạn 3 lượt đăng ký mỗi giờ cho mỗi IP
  })
}

// Fallback in-memory rate limiter cho môi trường không cấu hình Redis
const ipRequests = new Map<string, { count: number; expiresAt: number }>()
const IN_MEMORY_LIMIT = 3
const IN_MEMORY_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function checkInMemoryRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = ipRequests.get(ip)
  
  if (!record || record.expiresAt < now) {
    ipRequests.set(ip, { count: 1, expiresAt: now + IN_MEMORY_WINDOW_MS })
    return true
  }
  
  if (record.count >= IN_MEMORY_LIMIT) {
    return false
  }
  
  record.count += 1
  return true
}

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra Rate Limiting
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown-ip'
    
    if (ratelimit) {
      const { success } = await ratelimit.limit(ip)
      if (!success) {
        return NextResponse.json({ error: 'Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau.' }, { status: 429 })
      }
    } else {
      // Dùng fallback in-memory nếu chưa cấu hình Redis
      if (!checkInMemoryRateLimit(ip)) {
        return NextResponse.json({ error: 'Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau.' }, { status: 429 })
      }
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { fullName, email, password, orgName, phone } = parsed.data
    const adminSupabase = createAdminClient()

    // 2. Kiểm tra xem email hoặc SĐT đã tồn tại chưa trong public.users
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('id, email')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'Email hoặc Số điện thoại đã được đăng ký' }, { status: 400 })
    }

    // 3. Tạo Auth User trong Supabase (để login)
    // Cập nhật: email_confirm: false để bắt buộc người dùng xác thực email
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        phone,
      }
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Lỗi tạo tài khoản Auth: ' + authError?.message }, { status: 500 })
    }

    // 4. Tạo Organization và Public User thông qua RPC (ACID Transaction)
    const { data: orgId, error: rpcError } = await adminSupabase.rpc('register_saas_org', {
      auth_user_id: authData.user.id,
      org_name: orgName,
      admin_email: email,
      admin_phone: phone,
      admin_full_name: fullName
    })

    if (rpcError || !orgId) {
      // Rollback Auth user nếu lỗi RPC
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Lỗi lưu dữ liệu người dùng (Transaction aborted): ' + rpcError?.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để kích hoạt.',
      organization_id: orgId
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
