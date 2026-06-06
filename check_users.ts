import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- Kiểm tra bảng public.users ---')
  const { data: publicUsers } = await supabase.from('users').select('id, email, role')
  console.log(publicUsers)

  console.log('\n--- Kiểm tra hệ thống Auth (auth.users) ---')
  const { data: authUsers, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Lỗi khi lấy auth.users:', error.message)
  } else {
    const emails = authUsers.users.map(u => ({ id: u.id, email: u.email }))
    console.log(emails)
  }
}

run()
