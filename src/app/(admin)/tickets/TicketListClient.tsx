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
import { Check, Eye, DollarSign, CheckCircle2, Wrench, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { resolveTicket } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Ticket = {
  id: number
  roomId?: number
  room: string
  title: string
  date: string
  priority: string
  status: string
  repairCost?: number
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
              repairCost: newDoc.repair_cost ?? undefined,
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
                  ? { ...t, status: updatedDoc.status, priority: updatedDoc.priority, repairCost: updatedDoc.repair_cost ?? undefined }
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

  const resolvedTickets = tickets.filter((t) => t.status === 'resolved')
  const totalCost = resolvedTickets.reduce((sum, t) => sum + (t.repairCost || 0), 0)
  const averageCost = resolvedTickets.length > 0 
    ? Math.round(totalCost / resolvedTickets.length) 
    : 0
  const ticketsWithCostCount = resolvedTickets.filter((t) => (t.repairCost || 0) > 0).length
  const pendingTicketsCount = tickets.filter((t) => t.status === 'pending').length
  const inProgressTicketsCount = tickets.filter((t) => t.status === 'in-progress').length

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Phòng</TableHead>
              <TableHead>Vấn đề</TableHead>
              <TableHead>Ngày báo</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Chi phí sửa chữa</TableHead>
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
                  <TableCell className="font-semibold text-blue-600">
                    {ticket.repairCost !== undefined && ticket.repairCost !== null
                      ? `${ticket.repairCost.toLocaleString('vi-VN')} đ`
                      : '—'}
                  </TableCell>
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
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Chưa có yêu cầu sửa chữa nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-xl font-bold tracking-tight mb-4">Thống kê chi phí bảo trì</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-50/50 shadow-sm border border-slate-100 hover:border-blue-200 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng chi phí sửa chữa</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100/80 text-blue-700">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{totalCost.toLocaleString('vi-VN')} đ</div>
              <p className="text-xs text-muted-foreground mt-1">Từ các sự cố đã hoàn tất</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-50/50 shadow-sm border border-slate-100 hover:border-green-200 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sự cố đã xử lý</CardTitle>
              <div className="p-2 rounded-lg bg-green-100/80 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{resolvedTickets.length} sự cố</div>
              <p className="text-xs text-muted-foreground mt-1">Trong đó {ticketsWithCostCount} sự cố phát sinh phí</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-50/50 shadow-sm border border-slate-100 hover:border-purple-200 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chi phí trung bình</CardTitle>
              <div className="p-2 rounded-lg bg-purple-100/80 text-purple-700">
                <Wrench className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{averageCost.toLocaleString('vi-VN')} đ</div>
              <p className="text-xs text-muted-foreground mt-1">Tỷ lệ bình quân trên mỗi sự cố</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-50/50 shadow-sm border border-slate-100 hover:border-amber-200 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cần xử lý còn lại</CardTitle>
              <div className="p-2 rounded-lg bg-amber-100/80 text-amber-700">
                <AlertCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{pendingTicketsCount + inProgressTicketsCount} sự cố</div>
              <p className="text-xs text-muted-foreground mt-1">{pendingTicketsCount} chờ xử lý, {inProgressTicketsCount} đang sửa</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
