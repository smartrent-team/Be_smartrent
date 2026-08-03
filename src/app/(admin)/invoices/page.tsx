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
import { Eye, CheckCircle2, Clock, Plus } from 'lucide-react'
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
import { Pagination } from '@/components/shared/Pagination'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addInvoiceAction } from './actions'
import { InvoiceActions } from './_components/InvoiceActions'

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const page = parseInt(params.page as string || '1', 10)
  const status = params.status as string || 'all'
  const limit = 10
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  let query = adminSupabase
    .from('invoices')
    .select('id, invoice_code, total_amount, payment_status, issued_at, due_date, room:rooms(room_code), tenant:tenants(user:users(full_name))', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('payment_status', status)
  }

  const { data: rawInvoices, count, error: queryError } = await query.range(from, to)
  
  if (queryError) {
    console.error("Lỗi truy vấn invoices:", queryError)
  }

  const totalPages = count ? Math.ceil(count / limit) : 0

  const invoices = ((rawInvoices as any[]) || []).map((inv) => {
    const roomObj = Array.isArray(inv.room) ? inv.room[0] : inv.room
    const tenantObj = Array.isArray(inv.tenant) ? inv.tenant[0] : inv.tenant
    const userObj = tenantObj ? (Array.isArray(tenantObj.user) ? tenantObj.user[0] : tenantObj.user) : null

    return {
      id: inv.id,
      code: inv.invoice_code || inv.id.toString(),
      room: roomObj?.room_code || 'Trống',
      amount: inv.total_amount || 0,
      status: inv.payment_status || 'unpaid',
      date: inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('vi-VN') : 'N/A',
      dueDate: inv.due_date || '',
      tenant: userObj?.full_name || 'Khách vãng lai',
    }
  })

  const { data: rooms } = await adminSupabase.from('rooms').select('id, room_code').order('room_code')

  return (
    <div className="flex flex-col gap-6 p-6">
      {queryError && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200" role="alert">
          <span className="font-semibold">Lỗi truy vấn cơ sở dữ liệu:</span> {queryError.message} (Mã: {queryError.code})
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hoá đơn</h1>
          <p className="text-muted-foreground mt-2">Quản lý thu phí, điện nước và thanh toán PayOS.</p>
        </div>
        
        <Sheet>
          <SheetTrigger>
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2">
              <Plus className="h-4 w-4" />
              Tạo hoá đơn mới
            </div>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Tạo hoá đơn mới</SheetTitle>
              <SheetDescription>
                Nhập các khoản phí để tạo hoá đơn và sinh mã thanh toán PayOS.
              </SheetDescription>
            </SheetHeader>
            <form action={addInvoiceAction}>
              <div className="grid gap-4 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="room_id">Chọn phòng</Label>
                  <select 
                    name="room_id" 
                    id="room_id"
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Chọn phòng --</option>
                    {rooms?.map((r) => (
                      <option key={r.id} value={r.id}>Phòng {r.room_code}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="roomPrice">Tiền phòng (VND)</Label>
                  <Input id="roomPrice" name="roomPrice" type="number" required placeholder="Ví dụ: 3000000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="electricOld">Chỉ số điện cũ</Label>
                    <Input id="electricOld" name="electricOld" type="number" defaultValue="0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="electricNew">Chỉ số điện mới</Label>
                    <Input id="electricNew" name="electricNew" type="number" defaultValue="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="waterOld">Chỉ số nước cũ</Label>
                    <Input id="waterOld" name="waterOld" type="number" defaultValue="0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="waterNew">Chỉ số nước mới</Label>
                    <Input id="waterNew" name="waterNew" type="number" defaultValue="0" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="serviceCost">Phí dịch vụ khác (VND)</Label>
                  <Input id="serviceCost" name="serviceCost" type="number" defaultValue="0" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="submit">Tạo hoá đơn</Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Link href="?status=all">
          <Button variant={status === 'all' ? 'default' : 'outline'} size="sm">Tất cả</Button>
        </Link>
        <Link href="?status=unpaid">
          <Button variant={status === 'unpaid' ? 'default' : 'outline'} size="sm">Chưa thanh toán</Button>
        </Link>
        <Link href="?status=paid">
          <Button variant={status === 'paid' ? 'default' : 'outline'} size="sm">Đã thanh toán</Button>
        </Link>
      </div>
      
      <InvoiceTable invoices={invoices} />
      
      <Pagination totalPages={totalPages} currentPage={page} />
    </div>
  )
}

interface InvoiceFormatted {
  id: number;
  code: string;
  room: string;
  tenant: string;
  date: string;
  dueDate: string;
  amount: number;
  status: string;
}

function InvoiceTable({ invoices }: { invoices: InvoiceFormatted[] }) {
  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã HĐ</TableHead>
            <TableHead>Phòng</TableHead>
            <TableHead>Khách thuê</TableHead>
            <TableHead>Ngày lập</TableHead>
            <TableHead>Tổng tiền</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length > 0 ? (
            invoices.map((inv) => (
              <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-medium">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="text-teal-600 hover:text-teal-800 hover:underline font-semibold"
                  >
                    {inv.code}
                  </Link>
                </TableCell>
                <TableCell>P.{inv.room}</TableCell>
                <TableCell>{inv.tenant}</TableCell>
                <TableCell>{inv.date}</TableCell>
                <TableCell className="font-semibold">{inv.amount.toLocaleString()}đ</TableCell>
                <TableCell>
                  {inv.status === 'paid' && <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Đã thu</Badge>}
                  {inv.status === 'unpaid' && <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"><Clock className="w-3 h-3 mr-1"/> Chưa thu</Badge>}
                  {inv.status === 'partial' && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="w-3 h-3 mr-1"/> Thiếu</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/invoices/${inv.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-teal-50" title="Xem chi tiết">
                        <Eye className="h-3.5 w-3.5 text-teal-600" />
                      </Button>
                    </Link>
                    <InvoiceActions invoice={inv} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                Không có dữ liệu hoá đơn
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
