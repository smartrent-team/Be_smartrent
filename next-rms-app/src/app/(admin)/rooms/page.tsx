import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addRoom } from './actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from 'next/link'

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
        
        <Sheet>
          <SheetTrigger>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Thêm phòng mới
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Thêm phòng mới</SheetTitle>
              <SheetDescription>
                Nhập thông tin chi tiết để tạo phòng mới trong hệ thống.
              </SheetDescription>
            </SheetHeader>
            <form action={addRoom}>
              <div className="grid gap-4 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="roomNumber">Số phòng / Tên phòng</Label>
                  <Input id="roomNumber" name="roomNumber" required placeholder="VD: 101, 202A..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branch">Chi nhánh</Label>
                  <select 
                    id="branch" 
                    name="branch" 
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">-- Chọn chi nhánh --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id.toString()}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="floor">Tầng</Label>
                  <Input id="floor" name="floor" type="number" placeholder="1" defaultValue="1" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Giá thuê (VND)</Label>
                  <Input id="price" name="price" type="number" placeholder="3500000" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="area">Diện tích (m2)</Label>
                  <Input id="area" name="area" type="number" placeholder="25" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="submit">Lưu thông tin</Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Link href="?status=all">
          <Button variant={status === 'all' ? 'default' : 'outline'} size="sm">Tất cả</Button>
        </Link>
        <Link href="?status=available">
          <Button variant={status === 'available' ? 'default' : 'outline'} size="sm">Trống</Button>
        </Link>
        <Link href="?status=occupied">
          <Button variant={status === 'occupied' ? 'default' : 'outline'} size="sm">Đã thuê</Button>
        </Link>
        <Link href="?status=maintenance">
          <Button variant={status === 'maintenance' ? 'default' : 'outline'} size="sm">Bảo trì</Button>
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
                <TableCell className="font-medium">{room.room_code}</TableCell>
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
                  {/* Action buttons could go here */}
                  <span className="text-sm text-blue-500 cursor-pointer">Chi tiết</span>
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
