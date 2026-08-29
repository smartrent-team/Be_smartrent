import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Phone, MapPin, AlertTriangle, Building } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import StatusUpdater from './StatusUpdater'
import EditTicketDialog from './EditTicketDialog'

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminSupabase = createAdminClient()

  // Lấy chi tiết ticket kèm thông tin phòng, chi nhánh và khách thuê
  const { data: ticket, error } = await adminSupabase
    .from('maintenance_tickets')
    .select(`
      *,
      rooms (room_code, branch_id, branch:branches(id, name, address)),
      tenants (
        users (full_name, phone)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !ticket) {
    notFound()
  }

  // Lấy thông tin quản lý chi nhánh
  const branchId = ticket.rooms?.branch_id
  let branchManager: { full_name: string; phone: string } | null = null
  if (branchId) {
    const { data: manager } = await adminSupabase
      .from('users')
      .select('full_name, phone')
      .eq('role', 'manager')
      .eq('branch_id', branchId)
      .limit(1)
      .maybeSingle()
    branchManager = manager
  }

  const roomCode = ticket.rooms?.room_code || 'Không xác định'
  const branchInfo = ticket.rooms?.branch
  const branchName = branchInfo?.name || 'Chưa xác định'
  const tenantUser = ticket.tenants?.users
  const fullName = tenantUser?.full_name || 'Khách thuê (Chưa cập nhật tên)'
  const phone = tenantUser?.phone || 'Chưa cập nhật SĐT'

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">Gấp</Badge>
      case 'medium': return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Bình thường</Badge>
      case 'low': return <Badge variant="outline">Thấp</Badge>
      default: return null
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tickets" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Chi tiết báo hỏng</h1>
        </div>
        <div className="flex items-center gap-3">
          <EditTicketDialog 
            ticketId={ticket.id}
            initialTitle={ticket.title}
            initialDescription={ticket.description || ''}
            initialPriority={ticket.priority as 'low' | 'medium' | 'high'}
          />
          <StatusUpdater ticketId={ticket.id} currentStatus={ticket.status as 'pending' | 'in-progress' | 'resolved'} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cột trái: Thông tin sự cố */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{ticket.title}</CardTitle>
              <CardDescription>
                Báo hỏng lúc: {new Date(ticket.created_at).toLocaleString('vi-VN')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground w-24">Phòng:</span>
                <Badge variant="outline" className="text-sm"><MapPin className="mr-1 h-3 w-3" /> P.{roomCode}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground w-24">Chi nhánh:</span>
                <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200"><Building className="mr-1 h-3 w-3" /> {branchName}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground w-24">Ưu tiên:</span>
                {getPriorityBadge(ticket.priority)}
              </div>
              {ticket.repair_cost !== null && ticket.repair_cost !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-muted-foreground w-24">Chi phí:</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                    {Number(ticket.repair_cost).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Mô tả sự cố:</h3>
                <p className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-md border">
                  {ticket.description || 'Khách thuê không để lại mô tả chi tiết.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: Thông tin liên hệ */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin liên hệ</CardTitle>
              <CardDescription>
                Liên hệ với khách thuê để xác minh hoặc hẹn lịch sửa chữa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{fullName}</p>
                  <p className="text-xs text-muted-foreground">Người báo hỏng</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-700 rounded-full">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{phone}</p>
                  <p className="text-xs text-muted-foreground">Số điện thoại</p>
                </div>
              </div>
              
              {/* Nút hành động nhanh */}
              <div className="pt-4 flex gap-2">
                <a href={`tel:${phone}`} className={buttonVariants({ variant: 'outline', className: 'w-full gap-2' })}>
                  <Phone className="h-4 w-4" /> Gọi ngay
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Thông tin chi nhánh & quản lý */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chi nhánh & Quản lý</CardTitle>
              <CardDescription>
                Thông tin chi nhánh và quản lý phụ trách.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-full">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{branchName}</p>
                  {branchInfo?.address && (
                    <p className="text-xs text-muted-foreground">{branchInfo.address}</p>
                  )}
                </div>
              </div>
              {branchManager ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 text-teal-700 rounded-full">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{branchManager.full_name}</p>
                      <p className="text-xs text-muted-foreground">Quản lý chi nhánh</p>
                    </div>
                  </div>
                  {branchManager.phone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 text-green-700 rounded-full">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{branchManager.phone}</p>
                        <p className="text-xs text-muted-foreground">SĐT quản lý</p>
                      </div>
                    </div>
                  )}
                  <div className="pt-4 flex gap-2">
                    <a href={`tel:${branchManager.phone}`} className={buttonVariants({ variant: 'outline', className: 'w-full gap-2' })}>
                      <Phone className="h-4 w-4" /> Gọi quản lý
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có quản lý được gán cho chi nhánh này.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Lưu ý</p>
                <p>Hãy cập nhật trạng thái sang <strong>&quot;Đang sửa&quot;</strong> khi thợ bắt đầu tiến hành, và <strong>&quot;Đã xong&quot;</strong> sau khi hoàn tất để khách thuê tiện theo dõi.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
