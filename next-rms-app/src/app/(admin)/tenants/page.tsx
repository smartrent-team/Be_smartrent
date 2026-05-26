import { createClient } from '@/lib/supabase/server'
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
import { UserPlus, Phone, Mail, Eye } from 'lucide-react'
import { Pagination } from '@/components/shared/Pagination'
import Link from 'next/link'

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const page = parseInt(params.page as string || '1', 10)
  const limit = 10
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createClient()
  const { data: rawTenants, count } = await supabase
    .from('tenants')
    .select('id, move_in_date, move_out_date, room:rooms(room_number), user:users(full_name, email, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = count ? Math.ceil(count / limit) : 0

  interface TenantData {
    id: string;
    move_in_date?: string;
    move_out_date?: string;
    room?: { room_number: string };
    user?: { full_name: string; email: string; phone: string };
  }

  const tenants = ((rawTenants as unknown as TenantData[]) || []).map((t) => ({
    id: t.id,
    name: t.user?.full_name || 'Khách chưa có tên',
    phone: t.user?.phone || 'Chưa cập nhật',
    email: t.user?.email || 'Chưa cập nhật',
    room: t.room?.room_number || 'Trống',
    status: t.move_out_date ? 'past' : 'active',
    joinDate: t.move_in_date ? new Date(t.move_in_date).toLocaleDateString('vi-VN') : 'N/A',
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Khách thuê</h1>
          <p className="text-muted-foreground mt-2">Quản lý thông tin và hợp đồng của khách thuê.</p>
        </div>
        
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Thêm khách mới
        </Button>
      </div>
      
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Ngày vào ở</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {tenant.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {tenant.email}</span>
                  </div>
                </TableCell>
                <TableCell>Phòng {tenant.room}</TableCell>
                <TableCell>{tenant.joinDate}</TableCell>
                <TableCell>
                  <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className={tenant.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                    {tenant.status === 'active' ? 'Đang ở' : 'Đã trả phòng'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/tenants/${tenant.id}`}>
                    <Button variant="ghost" size="icon" title="Xem chi tiết">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  )
}
