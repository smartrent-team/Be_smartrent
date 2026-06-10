import { verifyRole } from '@/lib/rbac'
import { RoomService } from '@/services/room.service'
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
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { CreateRoomDialog } from './_components/CreateRoomDialog'

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const status = params.status as string || 'all'
  const pageStr = params.page as string || '1'
  const currentPage = parseInt(pageStr, 10) || 1
  const limit = 10

  const auth = await verifyRole()
  if (auth.error || !auth.user || !auth.role) {
    return <div>Không có quyền truy cập</div>
  }
  const supabase = auth.supabase!

  interface RenderRoomData {
    id: number;
    roomCode: string;
    floor: number | null;
    area: number | null;
    basePrice: number;
    status: string;
    branchName?: string;
    tenant: {
      id: number;
      name: string;
    } | null;
  }

  let roomsList: RenderRoomData[] = []
  let branches: { id: number; name: string }[] = []
  let totalPages = 0

  try {
    const [result, { data: rawBranches }] = await Promise.all([
      RoomService.getRoomsList({
        supabase,
        role: auth.role,
        authBranchId: auth.branchId,
        organizationId: auth.organizationId,
        options: {
          status: status === 'all' ? null : status,
          limit, 
          page: currentPage
        }
      }),
      supabase.from('branches').select('id, name').order('name')
    ])
    
    roomsList = result.docs
    totalPages = result.totalPages
    branches = rawBranches || []
  } catch (error) {
    console.error('Lỗi tải danh sách phòng:', error)
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
        
        <CreateRoomDialog branches={branches} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Link 
          href={`?status=all&page=1`} 
          className={buttonVariants({ variant: status === 'all' ? 'default' : 'outline', size: 'sm' })}
        >
          Tất cả
        </Link>
        <Link 
          href={`?status=available&page=1`} 
          className={buttonVariants({ variant: status === 'available' ? 'default' : 'outline', size: 'sm' })}
        >
          Trống
        </Link>
        <Link 
          href={`?status=occupied&page=1`} 
          className={buttonVariants({ variant: status === 'occupied' ? 'default' : 'outline', size: 'sm' })}
        >
          Đã thuê
        </Link>
        <Link 
          href={`?status=maintenance&page=1`} 
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
                  {room.roomCode}
                  <span className="text-xs text-muted-foreground ml-2">(ID: {room.id})</span>
                </TableCell>
                <TableCell className="font-semibold text-emerald-800">
                  {room.branchName || 'Chưa phân chi nhánh'}
                </TableCell>
                <TableCell>{room.floor}</TableCell>
                <TableCell>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.basePrice)}
                </TableCell>
                <TableCell>{getStatusBadge(room.status)}</TableCell>
                <TableCell>
                  {room.tenant ? (
                    <span className="font-semibold text-slate-700">
                      {room.tenant.name}
                      <span className="text-xs text-gray-400 font-normal ml-2">(ID: {room.tenant.id})</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 italic text-xs">Trống</span>
                  )}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Link
            href={`?status=${status}&page=${Math.max(1, currentPage - 1)}`}
            className={`${buttonVariants({ variant: 'outline', size: 'sm' })} ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Trước
          </Link>
          <div className="text-sm font-medium mx-2">
            Trang {currentPage} / {totalPages}
          </div>
          <Link
            href={`?status=${status}&page=${Math.min(totalPages, currentPage + 1)}`}
            className={`${buttonVariants({ variant: 'outline', size: 'sm' })} ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
          >
            Sau
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  )
}
