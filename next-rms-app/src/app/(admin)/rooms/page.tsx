import { createClient } from '@/lib/supabase/server'
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

export default async function RoomsPage() {
  const supabase = await createClient()

  // In a real app, handle branch_id based on manager's role
  // Here we just fetch all rooms for simplicity
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .order('room_number', { ascending: true })

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
                  <Input id="branch" name="branch" type="number" placeholder="ID Chi nhánh (VD: 1)..." />
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
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã phòng</TableHead>
              <TableHead>Tầng</TableHead>
              <TableHead>Giá thuê</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms && rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.room_number}</TableCell>
                <TableCell>{room.floor}</TableCell>
                <TableCell>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.price)}
                </TableCell>
                <TableCell>{getStatusBadge(room.status)}</TableCell>
                <TableCell className="text-right">
                  {/* Action buttons could go here */}
                  <span className="text-sm text-blue-500 cursor-pointer">Chi tiết</span>
                </TableCell>
              </TableRow>
            ))}
            {(!rooms || rooms.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
