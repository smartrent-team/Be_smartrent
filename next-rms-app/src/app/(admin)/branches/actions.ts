'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addBranch(formData: FormData) {
  const supabase = await createClient()

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

export async function deleteBranch(id: number) {
  const supabase = await createClient()

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
