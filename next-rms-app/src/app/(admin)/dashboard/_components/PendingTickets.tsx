import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@/lib/supabase/server'

export default async function PendingTickets() {
  interface TicketData {
    id: string;
    title: string;
    priority: string;
    created_at: string;
    room?: { room_number: string };
  }

  const supabase = await createClient()

  const { data: pendingTickets } = await supabase
    .from('maintenance_tickets')
    .select('id, title, priority, created_at, room:rooms(room_number)')
    .in('status', ['pending', 'in-progress'])
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <Card className="col-span-3 hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Yêu cầu bảo trì chờ xử lý</CardTitle>
        <CardDescription>Cần xử lý gấp.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {pendingTickets && pendingTickets.length > 0 ? (pendingTickets as unknown as TicketData[]).map((ticket) => (
            <div key={ticket.id} className="flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0 hover:bg-slate-50 transition-colors p-2 -mx-2 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Phòng {ticket.room?.room_number} - {ticket.title}</p>
                {ticket.priority === 'high' && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                    Gấp
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Báo cáo lúc {new Date(ticket.created_at).toLocaleString('vi-VN')}</p>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">Tuyệt vời! Không có sự cố nào cần xử lý.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
