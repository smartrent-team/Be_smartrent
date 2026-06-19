'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Check, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { resolveTicket } from './actions'

type Ticket = {
  id: number
  roomId?: number
  room: string
  title: string
  date: string
  priority: string
  status: string
}

export default function TicketListClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const supabase = createClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Khởi tạo audio
    audioRef.current = new Audio('/tieng_doc_1780103089973.mp3')
    audioRef.current.volume = 0.5
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_tickets' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newDoc = payload.new
            // Lấy thêm thông tin phòng (vì payload chỉ có room_id)
            // Tạm thời hiển thị "Mới" nếu chưa kịp fetch room_number
            const newTicket: Ticket = {
              id: newDoc.id,
              roomId: newDoc.room_id,
              room: '...',
              title: newDoc.title || 'Yêu cầu mới',
              date: new Date(newDoc.created_at).toLocaleDateString('vi-VN'),
              priority: newDoc.priority || 'medium',
              status: newDoc.status || 'pending',
            }
            
            setTickets((prev) => [newTicket, ...prev])
            
            toast.success('Có yêu cầu sửa chữa mới!', {
              description: newDoc.title,
            })
            
            // Phát âm thanh nếu có file
            audioRef.current?.play().catch(e => console.log('Auto-play prevented by browser', e))
            
          } else if (payload.eventType === 'UPDATE') {
            const updatedDoc = payload.new
            setTickets((prev) =>
              prev.map((t) =>
                t.id === updatedDoc.id
                  ? { ...t, status: updatedDoc.status, priority: updatedDoc.priority }
                  : t
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">Gấp</Badge>
      case 'medium': return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Bình thường</Badge>
      case 'low': return <Badge variant="outline">Thấp</Badge>
      default: return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-slate-100">Chờ xử lý</Badge>
      case 'in-progress': return <Badge variant="outline" className="bg-blue-100 text-blue-800">Đang sửa</Badge>
      case 'resolved': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Đã xong</Badge>
      default: return null
    }
  }

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Phòng</TableHead>
            <TableHead>Vấn đề</TableHead>
            <TableHead>Ngày báo</TableHead>
            <TableHead>Mức độ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">
                  {ticket.room && ticket.room !== 'Chung' && ticket.room !== '...' ? `P.${ticket.room}` : ticket.room}
                  {ticket.roomId && <span className="text-xs text-muted-foreground ml-2">(ID: {ticket.roomId})</span>}
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={ticket.title}>{ticket.title}</TableCell>
                <TableCell>{ticket.date}</TableCell>
                <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/tickets/${ticket.id}`} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-2' })}>
                      <Eye className="h-4 w-4" /> Xem
                    </Link>
                    {ticket.status !== 'resolved' && (
                      <form action={resolveTicket.bind(null, ticket.id)}>
                        <Button variant="secondary" size="sm" className="gap-2" type="submit">
                          <Check className="h-4 w-4" /> Xong
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                Chưa có yêu cầu sửa chữa nào.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
