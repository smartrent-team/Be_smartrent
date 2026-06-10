import { createClient } from '@supabase/supabase-js'

// Hàm này trả về Supabase Admin Client, BỎ QUA RLS (Row Level Security).
// TUYỆT ĐỐI KHÔNG dùng ở Client (trình duyệt) hay chia sẻ ra ngoài.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase Admin environment variables are missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  )
}
