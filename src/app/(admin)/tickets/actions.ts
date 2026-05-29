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
  }

  const { data: profile } = await query.single()
  if (profile?.role !== 'super_admin') {
    throw new Error('Bạn không có quyền thực hiện hành động này (Yêu cầu Super Admin)')
  }
}

export async function resolveTicket(ticketId: string | number) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  const { error } = await supabase
    .from('maintenance_tickets')
    .update({ status: 'resolved' })
    .eq('id', ticketId)

  if (error) {
    console.error('Lỗi khi đánh dấu xong:', error)
    throw new Error(error.message)
  }

  revalidatePath('/tickets')
}
export async function updateTicketStatus(ticketId: string | number, status: 'pending' | 'in-progress' | 'resolved') {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  const { error } = await supabase
    .from('maintenance_tickets')
    .update({ status })
    .eq('id', ticketId)

  if (error) {
    console.error('Lỗi khi cập nhật trạng thái:', error)
    throw new Error(error.message)
  }

  revalidatePath('/tickets')
  revalidatePath(`/tickets/${ticketId}`)
}
export async function updateTicketDetails(
  ticketId: string | number,
  data: { title: string; description: string; priority: 'low' | 'medium' | 'high' }
) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  const { error } = await supabase
    .from('maintenance_tickets')
    .update({
      title: data.title,
      description: data.description,
      priority: data.priority,
    })
    .eq('id', ticketId)

  if (error) {
    console.error('Lỗi khi cập nhật chi tiết ticket:', error)
    throw new Error(error.message)
  }

  revalidatePath('/tickets')
  revalidatePath(`/tickets/${ticketId}`)
}
