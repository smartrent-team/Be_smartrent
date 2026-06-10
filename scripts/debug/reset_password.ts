import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Đang cài đặt mật khẩu cho tài khoản tai.dev.1499@gmail.com...')
  
  // Lấy lại ID chính xác nhất
  const { data: usersData } = await supabase.auth.admin.listUsers()
  const user = usersData.users.find(u => u.email === 'tai.dev.1499@gmail.com')

  if (user) {
    console.log('Tài khoản đã tồn tại với ID:', user.id, '- Đang đổi mật khẩu...')
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'Password123!'
    })
    if (error) console.error('Lỗi khi đổi mật khẩu:', error.message)
    else console.log('Đã đổi mật khẩu thành công: Password123!')
  } else {
    console.log('Tài khoản chưa có trong Auth. Đang tạo mới...')
    const { error } = await supabase.auth.admin.createUser({
      email: 'tai.dev.1499@gmail.com',
      password: 'Password123!',
      email_confirm: true
    })
    if (error) console.error('Lỗi khi tạo user:', error.message)
    else console.log('Đã tạo user thành công. Mật khẩu: Password123!')
  }
}

run()
