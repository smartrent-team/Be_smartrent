'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'

async function verifySuperAdmin(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Chưa đăng nhập')
  
  let query = supabase.from('users').select('role')
  if (user.email && user.phone) {
    query = query.or(`email.eq.${user.email},phone.eq.${user.phone}`)
  } else if (user.email) {
    query = query.eq('email', user.email)
  } else if (user.phone) {
    query = query.eq('phone', user.phone)
  } else {
    throw new Error('Không thể xác thực danh tính')
  }

  const { data: profile } = await query.single()
  if (profile?.role !== 'super_admin') {
    throw new Error('Bạn không có quyền thực hiện hành động này (Yêu cầu Super Admin)')
  }
}

export async function editManager(
  id: string,
  data: { fullName: string; phone: string; email: string; password?: string; branchId?: string }
) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  if (!data.fullName || !data.phone || !data.email) {
    throw new Error('Họ tên, email và số điện thoại là bắt buộc')
  }

  const formattedPhone = data.phone.startsWith('0') ? `+84${data.phone.slice(1)}` : data.phone

  const adminSupabase = createAdminClient()

  // 1. Cập nhật Auth User nếu có số điện thoại, email hoặc mật khẩu mới
  const updateAuthData: { phone?: string; phone_confirm?: boolean; email?: string; email_confirm?: boolean; password?: string } = {}
  if (formattedPhone) {
    updateAuthData.phone = formattedPhone
    updateAuthData.phone_confirm = true
  }
  if (data.email) {
    updateAuthData.email = data.email.trim()
    updateAuthData.email_confirm = true
  }
  if (data.password && data.password.trim() !== '') {
    updateAuthData.password = data.password
  }

  const userIntId = parseInt(id, 10)
  const { data: userProfile } = await adminSupabase.from('users').select('phone, email').eq('id', userIntId).single()

  if (Object.keys(updateAuthData).length > 0 && userProfile) {
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
    const authUser = authUsers.users.find(u => (userProfile.phone && u.phone === userProfile.phone) || (userProfile.email && u.email === userProfile.email))
    if (authUser) {
      const { error: authError } = await adminSupabase.auth.admin.updateUserById(authUser.id, updateAuthData)
      if (authError) {
        console.error('Lỗi khi cập nhật Auth User:', authError)
        throw new Error('Lỗi cập nhật tài khoản Auth: ' + authError.message)
      }
    }
  }

  // 2. Cập nhật profile trong bảng public.users
  const { error: dbError } = await adminSupabase
    .from('users')
    .update({
      full_name: data.fullName.trim(),
      phone: formattedPhone,
      email: data.email.trim(),
      branch_id: data.branchId && data.branchId !== 'none' ? parseInt(data.branchId, 10) : null,
    })
    .eq('id', userIntId)

  if (dbError) {
    console.error('Lỗi khi cập nhật profile Manager:', dbError)
    throw new Error('Lỗi cập nhật Profile: ' + dbError.message)
  }

  revalidatePath('/managers')
}

export async function deleteManager(id: string) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  const adminSupabase = createAdminClient()
  const userIntId = parseInt(id, 10)

  // Tìm thông tin profile để có SĐT tìm tài khoản Auth
  const { data: userProfile } = await adminSupabase.from('users').select('phone').eq('id', userIntId).single()

  // 1. Xóa thông tin profile trong public.users
  const { error: dbError } = await adminSupabase
    .from('users')
    .delete()
    .eq('id', userIntId)

  if (dbError) {
    console.error('Lỗi khi xóa profile Manager:', dbError)
    throw new Error('Lỗi xóa Profile: ' + dbError.message)
  }

  // 2. Xóa tài khoản người dùng trong Supabase Auth bằng cách tìm theo SĐT
  if (userProfile?.phone) {
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
    const authUser = authUsers.users.find(u => u.phone === userProfile.phone)
    if (authUser) {
      const { error: authError } = await adminSupabase.auth.admin.deleteUser(authUser.id)
      if (authError) {
        console.error('Lỗi khi xóa tài khoản Auth Manager:', authError)
        throw new Error('Lỗi xóa tài khoản Auth: ' + authError.message)
      }
    }
  }

  revalidatePath('/managers')
}
