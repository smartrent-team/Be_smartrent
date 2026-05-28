'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function resolveTicket(ticketId: string | number) {
  const supabase = await createClient()

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
