'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Eye, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface RoomTenant {
  id: number
  move_out_date: string | null
  user?: { full_name: string } | null
}

export interface RoomRow {
  id: number
  room_code: string
  branch?: { name: string } | null
  floor: number | null
  base_price: number
  status: string
  tenants?: RoomTenant[]
}

export default function RoomListClient({ initialRooms }: { initialRooms: RoomRow[] }) {
  const [rooms, setRooms] = useState<RoomRow[]>(initialRooms)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const router = useRouter()
  const supabase = createClient()

  const refresh = useCallback(() => {
    router.refresh()
    setLastUpdated(new Date())
  }, [router])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.info('Có phòng mới được thêm vào hệ thống')
          refresh()
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new
          setRooms(prev => prev.map(r =>
            r.id === updated.id
              ? { ...r, status: updated.status, base_price: updated.base_price, floor: updated.floor }
              : r
          ))
          setLastUpdated(new Date())
        } else if (payload.eventType === 'DELETE') {
          setRooms(prev => prev.filter(r => r.id !== payload.old.id))
          setLastUpdated(new Date())
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        // Khi tenant thay đổi (vào/ra phòng) → reload để cập nhật cột Khách thuê
        refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, refresh])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':   return <Badge variant="outline" className="text-green-600">Trống</Badge>
      case 'occupied':    return <Badge variant="default" className="bg-blue-600">Đã thuê</Badge>
      case 'maintenance': return <Badge variant="destructive">Bảo trì</Badge>
      default:            return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <RefreshCw className="h-3 w-3" />
        <span>Cập nhật lần cuối: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
        <span className="ml-1 w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" title="Đang kết nối realtime" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã phòng</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Tầng</TableHead>
              <TableHead>Giá thuê</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Khách thuê</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => {
              const activeTenant = room.tenants?.find(t => !t.move_out_date) ?? null
              return (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">
                    {room.room_code}
                    <span className="text-xs text-muted-foreground ml-2">(ID: {room.id})</span>
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-800">
                    {room.branch?.name || 'Chưa phân chi nhánh'}
                  </TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.base_price)}
                  </TableCell>
                  <TableCell>{getStatusBadge(room.status)}</TableCell>
                  <TableCell>
                    {activeTenant ? (
                      <span className="font-semibold text-slate-700">
                        {activeTenant.user?.full_name || 'Khách chưa đặt tên'}
                        <span className="text-xs text-gray-400 font-normal ml-2">(ID: {activeTenant.id})</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Trống</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/rooms/${room.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 rounded-lg h-9 w-9 flex items-center justify-center'}
                      title="Xem chi tiết"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
            {rooms.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Không có dữ liệu phòng.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
