'use server'

import { createClient } from '@/lib/supabase/server'
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

export async function addBranch(formData: FormData) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  const name = formData.get('name') as string
  const address = formData.get('address') as string || null
  const phone = formData.get('phone') as string || null
  const description = formData.get('description') as string || null

  if (!name || name.trim() === '') {
    throw new Error('Tên chi nhánh là bắt buộc')
  }

  const { error } = await supabase
    .from('branches')
    .insert([
      {
        name: name.trim(),
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
        description: description ? description.trim() : null,
        status: 'active'
      }
    ])

  if (error) {
    console.error('Lỗi khi thêm chi nhánh:', error)
    throw new Error(error.message)
  }

  revalidatePath('/branches')
}

export async function editBranch(id: number, formData: FormData) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  const name = formData.get('name') as string
  const address = formData.get('address') as string || null
  const phone = formData.get('phone') as string || null
  const description = formData.get('description') as string || null

  if (!name || name.trim() === '') {
    throw new Error('Tên chi nhánh là bắt buộc')
  }

  const { error } = await supabase
    .from('branches')
    .update({
      name: name.trim(),
      address: address ? address.trim() : null,
      phone: phone ? phone.trim() : null,
      description: description ? description.trim() : null
    })
    .eq('id', id)

  if (error) {
    console.error('Lỗi khi sửa chi nhánh:', error)
    throw new Error(error.message)
  }

  revalidatePath('/branches')
}

export async function deleteBranch(id: number) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Lỗi khi xóa chi nhánh:', error)
    throw new Error(error.message)
  }

  revalidatePath('/branches')
}
