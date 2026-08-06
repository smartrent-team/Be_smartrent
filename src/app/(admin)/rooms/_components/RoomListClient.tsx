'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Eye, RefreshCw, Users } from 'lucide-react'
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

// ─── Avatar stack + dropdown cho khách thuê ──────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w: string) => w[0].toUpperCase())
    .join('')
}

const AVATAR_COLORS = [
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

function TenantAvatarStack({ tenants }: { tenants: RoomTenant[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (tenants.length === 0) {
    return <span className="text-gray-400 italic text-xs">Trống</span>
  }

  const MAX_SHOW = 3
  const visible = tenants.slice(0, MAX_SHOW)
  const extra = tenants.length - MAX_SHOW

  return (
    <div ref={ref} className="relative inline-block">
      {/* Avatar stack */}
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center cursor-pointer group"
        title={tenants.length > 1 ? 'Xem tất cả khách thuê' : tenants[0].user?.full_name || ''}
      >
        <div className="flex -space-x-2">
          {visible.map((t, i) => {
            const name = t.user?.full_name || '?'
            return (
              <span
                key={t.id}
                className={`h-7 w-7 rounded-full border-2 border-white text-[10px] font-bold flex items-center justify-center shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
              >
                {getInitials(name)}
              </span>
            )
          })}
          {extra > 0 && (
            <span className="h-7 w-7 rounded-full border-2 border-white bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
              +{extra}
            </span>
          )}
        </div>
        {/* Tên nếu chỉ có 1 người */}
        {tenants.length === 1 && (
          <span className="ml-2 text-sm font-medium text-slate-700 group-hover:text-teal-700 transition-colors">
            {tenants[0].user?.full_name || 'Khách chưa đặt tên'}
          </span>
        )}
        {tenants.length > 1 && (
          <span className="ml-2 text-xs text-gray-500">{tenants.length} người</span>
        )}
      </button>

      {/* Dropdown danh sách */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Khách thuê ({tenants.length})</p>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {tenants.map((t, i) => {
              const name = t.user?.full_name || 'Khách chưa đặt tên'
              return (
                <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50">
                  <span className={`h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {getInitials(name)}
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RoomListClient({ initialRooms }: { initialRooms: RoomRow[] }) {
  const [rooms, setRooms] = useState<RoomRow[]>(initialRooms)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [mounted, setMounted] = useState<boolean>(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

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
        <span suppressHydrationWarning>
          Cập nhật lần cuối: {mounted ? lastUpdated.toLocaleTimeString('vi-VN') : ''}
        </span>
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
              <TableHead>Số người thuê</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Khách thuê</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => {
              const activeTenants = room.tenants?.filter(t => !t.move_out_date) ?? []
              return (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">
                    {room.room_code}
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-800">
                    {room.branch?.name || 'Chưa phân chi nhánh'}
                  </TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.base_price)}
                  </TableCell>
                  <TableCell>
                    {activeTenants.length > 0 ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-800 font-bold flex items-center gap-1 w-fit">
                        <Users className="h-3 w-3 text-slate-500" />
                        {activeTenants.length} người
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">0 người</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(room.status)}</TableCell>
                  <TableCell>
                    <TenantAvatarStack tenants={activeTenants} />
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
                <TableCell colSpan={8} className="h-24 text-center">Không có dữ liệu phòng.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
