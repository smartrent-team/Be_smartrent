import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Client dành riêng cho các API Routes (dành cho Mobile gọi lên bằng Header Bearer Token)
export async function createApiClient() {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  // Chuẩn hóa scheme JWT thành Bearer để Supabase có thể nhận diện đúng
  let finalAuthHeader = authHeader
  if (authHeader && authHeader.startsWith('JWT ')) {
    finalAuthHeader = authHeader.replace('JWT ', 'Bearer ')
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Vô hiệu hoá cookie vì mobile không dùng cookie
      cookies: {
        getAll() { return [] },
        setAll() {}
      },
      global: {
        headers: {
          // Gắn Token của Mobile vào header gửi lên Supabase
          ...(finalAuthHeader ? { Authorization: finalAuthHeader } : {})
        }
      }
    }
  )
}
