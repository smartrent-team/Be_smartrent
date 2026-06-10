'use server'

import { createClient } from '@/infrastructure/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateOrganizationStatus(orgId: number, status: 'active' | 'inactive') {
  const supabase = await createClient()
  
  // Kiểm tra quyền system_admin (double check on server side)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('email', user.email)
    .single()

  if (profile?.role !== 'system_admin') {
    return { error: 'Forbidden' }
  }

  // Cập nhật trạng thái
  const { error } = await supabase
    .from('organizations')
    .update({ status })
    .eq('id', orgId)

  if (error) {
    console.error('Lỗi khi update org status:', error)
    return { error: error.message }
  }

  revalidatePath('/system-admin/organizations')
  return { success: true }
}
