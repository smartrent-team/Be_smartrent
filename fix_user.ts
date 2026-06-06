import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Đang insert user vào public.users...')
  // Dùng id ngẫu nhiên cao để không trùng
  const { error } = await supabase.from('users').insert({
    email: 'tai.dev.1499@gmail.com',
    role: 'system_admin',
    full_name: 'System Admin'
  })

  if (error) {
    if (error.code === '23505') {
       // Nếu đã tồn tại, update nó
       await supabase.from('users').update({ role: 'system_admin' }).eq('email', 'tai.dev.1499@gmail.com')
       console.log('Đã cập nhật quyền system_admin cho email hiện có.')
    } else {
       console.error('Lỗi khi insert:', error.message)
    }
  } else {
    console.log('Thành công! Đã cấp quyền system_admin cho dinhtai1999t@gmail.com.')
  }
}

run()
