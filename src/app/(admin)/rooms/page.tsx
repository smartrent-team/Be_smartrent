

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import { CreateRoomDialog } from './_components/CreateRoomDialog'

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const status = params.status as string || 'all'

  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  let query = adminSupabase
    .from('rooms')
    .select('*, branch:branches(name), tenants(id, move_out_date, user:users(full_name))')
    .order('room_code', { ascending: true })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: rooms, error } = await query

  const { data: rawBranches } = await adminSupabase
    .from('branches')
    .select('id, name')
    .order('name')
  const branches = rawBranches || []

  if (error) {
    console.error(error)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="outline" className="text-green-600">Trống</Badge>
      case 'occupied':
        return <Badge variant="default" className="bg-blue-600">Đã thuê</Badge>
      case 'maintenance':
        return <Badge variant="destructive">Bảo trì</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  interface RoomTenant {
    id: number
    move_out_date: string | null
    user?: { full_name: string } | null
  }

  interface RoomData {
    id: number
    room_code: string
    branch?: { name: string } | null
    floor: number | null
    base_price: number
    status: string
    tenants?: RoomTenant[]
  }

  const roomsList = (rooms as unknown as RoomData[]) || []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý phòng</h1>
          <p className="text-muted-foreground mt-2">Xem và quản lý tất cả các phòng trong hệ thống.</p>
        </div>
        
        <CreateRoomDialog branches={branches} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Link 
          href="?status=all" 
          className={buttonVariants({ variant: status === 'all' ? 'default' : 'outline', size: 'sm' })}
        >
          Tất cả
        </Link>
        <Link 
          href="?status=available" 
          className={buttonVariants({ variant: status === 'available' ? 'default' : 'outline', size: 'sm' })}
        >
          Trống
        </Link>
        <Link 
          href="?status=occupied" 
          className={buttonVariants({ variant: status === 'occupied' ? 'default' : 'outline', size: 'sm' })}
        >
          Đã thuê
        </Link>
        <Link 
          href="?status=maintenance" 
          className={buttonVariants({ variant: status === 'maintenance' ? 'default' : 'outline', size: 'sm' })}
        >
          Bảo trì
        </Link>
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
            {roomsList.map((room) => (
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
                  {(() => {
                    const activeTenant = room.tenants && room.tenants.length > 0 
                      ? room.tenants.find((t) => !t.move_out_date) 
                      : null
                    return activeTenant ? (
                      <span className="font-semibold text-slate-700">{activeTenant.user?.full_name || 'Khách chưa đặt tên'}</span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Trống</span>
                    )
                  })()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/rooms/${room.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'icon' }) + " text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 rounded-lg h-9 w-9 flex items-center justify-center"}
                      title="Xem chi tiết"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {roomsList.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Không có dữ liệu phòng.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
