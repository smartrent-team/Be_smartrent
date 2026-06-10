import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const email = 'superadmin@smartrent.vn'
  const password = 'Password123!'

  console.log(`Đang tạo tài khoản Super Admin mới: ${email}...`)
  
  // 1. Tạo trong auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  })

  if (authError) {
    console.error('Lỗi tạo Auth:', authError.message)
    // Nếu lỗi do đã tồn tại, ta chỉ reset mk và update role
    if (authError.message.includes('already registered')) {
        console.log('Tài khoản đã tồn tại, sẽ cập nhật lại quyền và mật khẩu.')
        const { data: usersData } = await supabase.auth.admin.listUsers()
        const user = usersData.users.find(u => u.email === email)
        if (user) {
            await supabase.auth.admin.updateUserById(user.id, { password })
            await supabase.from('users').update({ role: 'super_admin' }).eq('email', email)
            console.log('Đã reset mật khẩu và quyền thành công!')
        }
    }
  } else {
    // 2. Tạo trong public.users nếu trigger chưa tạo kịp
    console.log('Tạo Auth thành công, đang kiểm tra public.users...')
    
    // Đợi 1 giây để trigger (nếu có) chạy xong
    await new Promise(res => setTimeout(res, 1000))
    
    const { data: userCheck } = await supabase.from('users').select('id').eq('email', email).single()
    if (!userCheck) {
        // Tự chèn nếu trigger ko có
        const { data: maxIdData } = await supabase.from('users').select('id').order('id', { ascending: false }).limit(1)
        const newId = (maxIdData?.[0]?.id || 0) + 1
        await supabase.from('users').insert({
            id: newId,
            email: email,
            role: 'super_admin',
            full_name: 'Test Super Admin'
        })
        console.log('Đã tự động thêm vào public.users')
    } else {
        await supabase.from('users').update({ role: 'super_admin' }).eq('email', email)
        console.log('Đã cập nhật quyền thành super_admin')
    }
  }
}

run()
