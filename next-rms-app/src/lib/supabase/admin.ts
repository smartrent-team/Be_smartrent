import { createClient } from '@supabase/supabase-js'

// Hàm này trả về Supabase Admin Client, BỎ QUA RLS (Row Level Security).
// TUYỆT ĐỐI KHÔNG dùng ở Client (trình duyệt) hay chia sẻ ra ngoài.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  )
}
