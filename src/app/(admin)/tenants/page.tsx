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
import { Button } from '@/components/ui/button'
import { Phone, Mail, Eye } from 'lucide-react'
import { Pagination } from '@/components/shared/Pagination'
import Link from 'next/link'
import { CreateTenantDialog } from './_components/CreateTenantDialog'
import { EditTenantDialog } from './_components/EditTenantDialog'
import { DeleteTenantButton } from './_components/DeleteTenantButton'

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const page = parseInt(params.page as string || '1', 10)
  const limit = 10
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Verify auth - chỉ cần đảm bảo đã đăng nhập
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS - đảm bảo super_admin thấy tất cả dữ liệu
  const adminSupabase = createAdminClient()

  // 1. Fetch tenants
  const { data: rawTenants, count } = await adminSupabase
    .from('tenants')
    .select('id, move_in_date, move_out_date, room_id, user_id, room:rooms(room_code, branch:branches(name)), user:users(full_name, email, phone), contracts(deposit_amount, status)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = count ? Math.ceil(count / limit) : 0

  // 2. Fetch rooms
  const { data: rawRooms } = await adminSupabase
    .from('rooms')
    .select('id, room_code, base_price, status')
    .order('room_code')
  const allRooms = rawRooms || []
  const availableRooms = allRooms.filter(r => r.status === 'available')

  interface TenantData {
    id: number;
    user_id: number;  // integer FK đến public.users.id
    room_id: number | null;
    move_in_date: string;
    move_out_date: string | null;
    room?: { room_code: string; branch?: { name: string } | null };
    user?: { full_name: string; email: string; phone: string };
    contracts?: { deposit_amount: number | null; status: string }[];
  }

  const tenants = ((rawTenants as unknown as TenantData[]) || []).map((t) => {
    const activeContract = t.contracts?.find((c) => c.status === 'active') || t.contracts?.[0]
    return {
      id: t.id,
      userId: t.user_id,
      roomId: t.room_id,
      depositAmount: activeContract?.deposit_amount || 0,
      name: t.user?.full_name || 'Khách chưa có tên',
      phone: t.user?.phone || 'Chưa cập nhật',
      email: t.user?.email || 'Chưa cập nhật',
      room: t.room?.room_code || 'Trống',
      branch: t.room?.branch?.name || 'Chưa phân chi nhánh',
      status: t.move_out_date ? 'past' : 'active',
      joinDate: t.move_in_date ? new Date(t.move_in_date).toLocaleDateString('vi-VN') : 'N/A',
      rawMoveInDate: t.move_in_date,
      rawMoveOutDate: t.move_out_date,
    }
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Khách thuê</h1>
          <p className="text-muted-foreground mt-2">Quản lý thông tin và hợp đồng của khách thuê.</p>
        </div>
        
        <CreateTenantDialog rooms={availableRooms} />
      </div>
      
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Ngày vào ở</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[140px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length > 0 ? (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {tenant.phone}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {tenant.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>Phòng {tenant.room}</TableCell>
                  <TableCell className="font-semibold text-emerald-800">{tenant.branch}</TableCell>
                  <TableCell>{tenant.joinDate}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className={tenant.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                      {tenant.status === 'active' ? 'Đang ở' : 'Đã trả phòng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="icon" title="Xem chi tiết" className="h-9 w-9">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <EditTenantDialog tenant={tenant} rooms={allRooms} />
                      <DeleteTenantButton id={tenant.id} userId={tenant.userId} name={tenant.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground py-10">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-lg font-semibold text-slate-500">Chưa có khách thuê nào</span>
                    <span className="text-xs max-w-xs text-slate-400">Hãy thêm khách thuê mới hoặc liên kết họ vào phòng để bắt đầu quản lý.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  )
}
