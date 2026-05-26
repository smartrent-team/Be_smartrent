import { createClient } from '@/lib/supabase/server'
import TicketListClient from './TicketListClient'

export default async function TicketsPage() {
  const supabase = await createClient()
  const { data: rawTickets } = await supabase
    .from('maintenance_tickets')
    .select('id, title, priority, status, created_at, room:rooms(room_number)')
    .order('created_at', { ascending: false })
  
  interface TicketData {
    id: number;
    title?: string;
    priority?: string;
    status?: string;
    created_at?: string;
    room?: { room_number: string };
  }

  const tickets = ((rawTickets as unknown as TicketData[]) || []).map((ticket) => ({
    id: ticket.id,
    room: ticket.room?.room_number || 'Chung',
    title: ticket.title || 'Không có tiêu đề',
    date: ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('vi-VN') : 'N/A',
    priority: ticket.priority || 'medium',
    status: ticket.status || 'pending',
  }))
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yêu cầu bảo trì</h1>
          <p className="text-muted-foreground mt-2">Theo dõi và xử lý các sự cố kỹ thuật từ khách thuê (Tự động cập nhật).</p>
        </div>
      </div>
      <TicketListClient initialTickets={tickets} />
    </div>
  )
}
