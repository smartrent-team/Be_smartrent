import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, User, MapPin, FileText, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContractImages, type ContractInfo } from '@/components/shared/ContractImages'
import { getContractImagesById } from '@/lib/contracts'
import { SettlementButton } from './SettlementButton'

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  const { data: tenant, error } = await adminSupabase
    .from('tenants')
    .select(`
      *,
      user:users(*),
      room:rooms(id, room_code, floor, base_price, vehicle_count),
      invoices(id, invoice_code, total_amount, payment_status, issued_at),
      contracts(
        id,
        status,
        deposit_amount,
        start_date,
        end_date,
        room_id,
        contract_images,
        room:rooms(id, room_code, floor)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !tenant) {
    console.error('Tenant fetch error for id', id, ':', error);
    notFound()
  }

  interface ContractData {
    id: number | string
    status: string
    contract_images?: string[]
    deposit_amount?: number | null
    start_date?: string | null
    end_date?: string | null
    room_id?: number | null
    room?: { id?: number; room_code?: string; floor?: number | string } | null
  }

  const allContracts = ((tenant.contracts as unknown as ContractData[]) || []).sort(
    (a, b) => Number(b.id) - Number(a.id)
  )

  const activeContractRaw =
    allContracts.find((c) =>
      ['active', 'pending_checkout', 'inspection', 'pending_settlement'].includes(c.status)
    ) ?? allContracts[0] ?? null

  let pendingCheckoutRequest = null
  if (activeContractRaw?.id) {
    const { data: requestData } = await adminSupabase
      .from('checkout_requests')
      .select('*')
      .eq('contract_id', activeContractRaw.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    pendingCheckoutRequest = requestData
  }

  let activeImages: string[] = []
  if (activeContractRaw?.id) {
    try {
      activeImages = await getContractImagesById(Number(activeContractRaw.id))
    } catch (contractError) {
      console.error('Tenant detail contract images fetch error for id', id, ':', contractError)
      activeImages = Array.isArray(activeContractRaw.contract_images)
        ? activeContractRaw.contract_images
        : []
    }
  }

  const activeContractFormatted: ContractInfo | null = activeContractRaw
    ? {
        contractId: Number(activeContractRaw.id),
        roomId: activeContractRaw.room_id ?? tenant.room?.id,
        roomCode: activeContractRaw.room?.room_code ?? tenant.room?.room_code,
        floor: activeContractRaw.room?.floor ?? tenant.room?.floor,
        startDate: activeContractRaw.start_date ?? tenant.move_in_date,
        endDate: activeContractRaw.end_date,
        status: activeContractRaw.status,
        images: activeImages,
      }
    : null

  // Hợp đồng cũ (các hợp đồng trước đó của khách thuê)
  const oldContractsFormatted: ContractInfo[] = await Promise.all(
    allContracts
      .filter((c) => String(c.id) !== String(activeContractRaw?.id))
      .map(async (c) => {
        let oldImages: string[] = []
        try {
          oldImages = await getContractImagesById(Number(c.id))
        } catch {
          oldImages = Array.isArray(c.contract_images) ? c.contract_images : []
        }
        return {
          contractId: Number(c.id),
          roomId: c.room_id ?? undefined,
          roomCode: c.room?.room_code,
          floor: c.room?.floor,
          startDate: c.start_date,
          endDate: c.end_date,
          status: c.status,
          images: oldImages,
        }
      })
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hồ sơ khách thuê</h1>
          <p className="text-muted-foreground mt-1">Chi tiết hợp đồng và lịch sử của khách hàng.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Thông tin cá nhân
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Họ và tên</p>
              <p className="font-medium text-lg">{tenant.user?.full_name || 'Chưa cập nhật'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Số điện thoại</p>
                <p className="font-medium">{tenant.user?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trạng thái</p>
                <div className="flex flex-col gap-2">
                  <Badge variant={tenant.move_out_date ? 'secondary' : 'default'} className={!tenant.move_out_date ? 'bg-green-600 w-fit' : 'w-fit'}>
                    {tenant.move_out_date ? 'Đã trả phòng' : 'Đang thuê'}
                  </Badge>
                  {pendingCheckoutRequest && (
                    <Badge variant="outline" className="w-fit text-orange-600 border-orange-200 bg-orange-50">
                      Tiến trình trả phòng: {
                        pendingCheckoutRequest.status === 'requested' ? 'Chờ kiểm tra' :
                        pendingCheckoutRequest.status === 'inspecting' ? 'Đã KT - Chờ Quyết Toán' :
                        pendingCheckoutRequest.status === 'pending_tenant_confirmation' ? 'Chờ KH xác nhận' :
                        pendingCheckoutRequest.status === 'completed' ? 'Đã hoàn tất' :
                        pendingCheckoutRequest.status === 'disputed' ? 'KH khiếu nại' : pendingCheckoutRequest.status
                      }
                    </Badge>
                  )}
                  {pendingCheckoutRequest?.status === 'inspecting' && (
                    <div className="mt-1">
                      <SettlementButton checkoutRequestId={pendingCheckoutRequest.id} />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CCCD / CMND</p>
                <p className="font-medium">
                  {tenant.identity_number && tenant.identity_number !== '000000000000'
                    ? tenant.identity_number
                    : 'Chưa cập nhật'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Chi tiết hợp đồng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phòng đang thuê</p>
                <Link href={`/rooms/${tenant.room?.id}`} className="font-medium text-blue-600 hover:underline">
                  Phòng {tenant.room?.room_code || 'N/A'}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiền cọc</p>
                <p className="font-medium">{activeContractRaw?.deposit_amount?.toLocaleString('vi-VN') || '0'} đ</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngày chuyển vào</p>
                <p className="font-medium">{new Date(tenant.move_in_date).toLocaleDateString('vi-VN')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngày hết hạn hợp đồng</p>
                <p className="font-medium">
                  {activeContractRaw?.end_date
                    ? new Date(activeContractRaw.end_date).toLocaleDateString('vi-VN')
                    : '---'}
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-1 border-t">
                <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Số lượng xe</p>
                  <p className="font-medium">
                    {(tenant.room as unknown as { vehicle_count: number | null })?.vehicle_count != null ? (
                      <>
                        <span>{(tenant.room as unknown as { vehicle_count: number | null }).vehicle_count}</span>
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lịch sử hoá đơn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.invoices && tenant.invoices.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Mã HĐ</th>
                      <th className="p-3 font-medium">Ngày lập</th>
                      <th className="p-3 font-medium">Tổng tiền</th>
                      <th className="p-3 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tenant.invoices as unknown as { id: string; invoice_code: string; issued_at: string; total_amount: number; payment_status: string }[]).map((inv) => (
                      <tr key={inv.id} className="border-t">
                        <td className="p-3">{inv.invoice_code || `HĐ ${inv.id}`}</td>
                        <td className="p-3">{new Date(inv.issued_at).toLocaleDateString('vi-VN')}</td>
                        <td className="p-3 font-medium">{inv.total_amount?.toLocaleString('vi-VN')} đ</td>
                        <td className="p-3">
                          <Badge variant={inv.payment_status === 'paid' ? 'default' : 'destructive'} className={inv.payment_status === 'paid' ? 'bg-green-100 text-green-800' : ''}>
                            {inv.payment_status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Khách thuê này chưa có hoá đơn nào.</p>
            )}
          </CardContent>
        </Card>

        {/* Component Quản lý Ảnh Hợp đồng: 2 Cột (Mới / Cũ) */}
        {tenant.room?.id && (
          <ContractImages 
            tenantId={tenant.id} 
            currentRoomId={tenant.room.id}
            currentRoomCode={tenant.room.room_code}
            currentRoomFloor={tenant.room.floor}
            activeContract={activeContractFormatted}
            oldContracts={oldContractsFormatted}
          />
        )}
      </div>
    </div>
  )
}
