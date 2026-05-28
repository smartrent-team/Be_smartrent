import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Phone, MapPin, Calendar, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import StatusUpdater from './StatusUpdater'

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminSupabase = createAdminClient()

  // Lấy chi tiết ticket kèm thông tin phòng và khách thuê
  const { data: ticket, error } = await adminSupabase
    .from('maintenance_tickets')
    .select(`
      *,
      rooms (room_code, branch_id),
      tenants (
        users (full_name, phone)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !ticket) {
    notFound()
  }

  const roomCode = ticket.rooms?.room_code || 'Không xác định'
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
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tickets">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Chi tiết báo hỏng #{ticket.id}</h1>
        </div>
        <StatusUpdater ticketId={ticket.id} currentStatus={ticket.status as any} />
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
                <span className="font-semibold text-muted-foreground w-24">Ưu tiên:</span>
                {getPriorityBadge(ticket.priority)}
              </div>
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
                <Button className="w-full gap-2" variant="outline" asChild>
                  <a href={`tel:${phone}`}>
                    <Phone className="h-4 w-4" /> Gọi ngay
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Lưu ý</p>
                <p>Hãy cập nhật trạng thái sang <strong>"Đang sửa"</strong> khi thợ bắt đầu tiến hành, và <strong>"Đã xong"</strong> sau khi hoàn tất để khách thuê tiện theo dõi.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
