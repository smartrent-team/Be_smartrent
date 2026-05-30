'use server'

import { verifySuperAdmin } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'





export async function resolveTicket(ticketId: string | number) {
  const supabase = await verifySuperAdmin()

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
  const supabase = await verifySuperAdmin()

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
  const supabase = await verifySuperAdmin()

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
