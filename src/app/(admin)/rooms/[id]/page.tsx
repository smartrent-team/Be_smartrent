import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Users, FileText, Wrench, Car } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { RoomFixturesSection } from '../_components/RoomFixturesSection'
import { EditRoomDialog } from '../_components/EditRoomDialog'

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  const [
    { data: room, error },
    { data: rawBranches }
  ] = await Promise.all([
    adminSupabase
      .from('rooms')
      .select(`
        *,
        tenants(id, user:users(full_name, phone), move_in_date, move_out_date),
        invoices(id, invoice_code, total_amount, payment_status, issued_at),
        maintenance_tickets(id, title, status, created_at),
        room_fixtures(id, name, quantity, status, description, created_at)
      `)
      .eq('id', id)
      .single(),
    adminSupabase
      .from('branches')
      .select('id, name')
      .order('name')
  ])

  if (error || !room) {
    notFound()
  }

  const branches = rawBranches || []

  interface TenantData {
    id: string;
    move_out_date: string | null;
    user?: { full_name: string; phone: string };
  }

  interface InvoiceData {
    id: string;
    invoice_code?: string;
    total_amount?: number;
    payment_status?: string;
    issued_at?: string;
  }

  interface TicketData {
    id: string;
    title: string;
    status: string;
    created_at: string;
  }

  const currentTenants = (room.tenants as unknown as TenantData[])?.filter((t) => !t.move_out_date) || []

  interface FixtureData {
    id: number;
    name: string;
    quantity: number;
    status: string;
    description: string | null;
    created_at: string;
  }

  const roomFixtures = ((room.room_fixtures || []) as unknown as FixtureData[]).map(fix => ({
    id: fix.id,
    name: fix.name,
    quantity: fix.quantity,
    status: fix.status,
    description: fix.description,
    createdAt: fix.created_at
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          <Link href="/rooms">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Phòng {room.room_code}
            </h1>
            <p className="text-muted-foreground mt-1">Thông tin chi tiết và lịch sử phòng.</p>
          </div>
        </div>
        <EditRoomDialog room={room} branches={branches} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin phòng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tầng</p>
                <p className="font-medium">{room.floor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diện tích</p>
                <p className="font-medium">{room.area} m²</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giá thuê</p>
                <p className="font-medium text-blue-600">{room.base_price.toLocaleString('vi-VN')} đ</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trạng thái</p>
                <Badge
                  variant={room.status === 'available' ? 'outline' : room.status === 'maintenance' ? 'destructive' : 'default'}
                  className={room.status === 'available' ? 'text-green-600' : room.status === 'maintenance' ? '' : 'bg-blue-600'}
                >
                  {room.status === 'available' ? 'Trống'
                    : room.status === 'maintenance' ? 'Bảo trì'
                    : 'Đã thuê'}
                </Badge>
              </div>
              <div className="col-span-2 flex items-center gap-3 pt-1 border-t">
                <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Số lượng xe</p>
                  <p className="font-medium">
                    {room.vehicle_count != null ? (
                      <>
                        <span className="text-base">{room.vehicle_count}</span>
                        <span className="text-sm text-muted-foreground ml-1">xe</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">Chưa cập nhật</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Khách thuê hiện tại
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentTenants.length > 0 ? (
              <div className="space-y-4">
                {currentTenants.map((t) => (
                  <div key={t.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">
                        {t.user?.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{t.user?.phone || 'Không có sđt'}</p>
                    </div>
                    <Link
                      href={`/tenants/${t.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' }) + " flex items-center justify-center"}
                    >
                      Xem
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Phòng hiện đang trống.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lịch sử hoá đơn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {room.invoices && room.invoices.length > 0 ? (
              <div className="space-y-3">
                {(room.invoices as unknown as InvoiceData[]).slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center text-sm">
                    <span>{inv.invoice_code || `HĐ ${inv.id}`}</span>
                    <span className="font-medium">{inv.total_amount?.toLocaleString('vi-VN')} đ</span>
                    <Badge variant={inv.payment_status === 'paid' ? 'default' : 'destructive'} className={inv.payment_status === 'paid' ? 'bg-green-100 text-green-800' : ''}>
                      {inv.payment_status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có hoá đơn nào.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Lịch sử bảo trì
            </CardTitle>
          </CardHeader>
          <CardContent>
            {room.maintenance_tickets && room.maintenance_tickets.length > 0 ? (
              <div className="space-y-3">
                {(room.maintenance_tickets as unknown as TicketData[]).slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="flex flex-col gap-1 text-sm border-b pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span className="font-medium">{ticket.title}</span>
                      <Badge variant="outline">{ticket.status === 'resolved' ? 'Đã xong' : 'Chờ xử lý'}</Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">{new Date(ticket.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không có ghi nhận bảo trì.</p>
            )}
          </CardContent>
        </Card>

        <RoomFixturesSection roomId={room.id} fixtures={roomFixtures} />
      </div>
    </div>
  )
}
