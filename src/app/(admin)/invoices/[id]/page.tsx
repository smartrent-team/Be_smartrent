import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { InvoiceActions } from '../_components/InvoiceActions'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Home,
  User,
  Phone,
  Mail,
  Building2,
  Zap,
  Droplets,
  Wrench,
  ConciergeBell,
  Receipt,
  CreditCard,
  Calendar,
  Hash,
} from 'lucide-react'

type PageProps = { params: Promise<{ id: string }> }

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + 'đ'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDatetime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status, dueDate }: { status: string; dueDate: string | null }) {
  const isOverdue = !['paid'].includes(status) && dueDate
    ? new Date() > new Date(dueDate)
    : false

  if (status === 'paid') {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-sm px-3 py-1 gap-1.5">
        <CheckCircle2 className="h-4 w-4" /> Đã thanh toán
      </Badge>
    )
  }
  if (isOverdue) {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 text-sm px-3 py-1 gap-1.5">
        <AlertTriangle className="h-4 w-4" /> Quá hạn
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-3 py-1 gap-1.5">
      <Clock className="h-4 w-4" /> Chưa thanh toán
    </Badge>
  )
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params
  const invoiceId = Number(id)
  if (!Number.isFinite(invoiceId)) notFound()

  // Auth
  const supabase = await createClient()
  await supabase.auth.getUser()
  const adminSupabase = createAdminClient()

  const { data: raw, error } = await adminSupabase
    .from('invoices')
    .select(`
      id, invoice_code, total_amount, payment_status,
      issued_at, due_date, created_at, paid_at,
      room_price, service_cost, electric_cost, water_cost, repair_cost,
      electric_old, electric_new, water_old, water_new,
      qrPayload, checkoutUrl,
      payment_account_number, payment_account_name,
      payment_bank_bin, payment_description,
      rooms (
        id, room_code, floor, base_price,
        branch:branches ( id, name )
      ),
      tenants (
        id,
        user:users ( full_name, phone, email )
      )
    `)
    .eq('id', invoiceId)
    .maybeSingle()

  if (error || !raw) notFound()

  const room   = Array.isArray(raw.rooms)   ? (raw.rooms as any[])[0]   : raw.rooms   as any
  const tenant = Array.isArray(raw.tenants) ? (raw.tenants as any[])[0] : raw.tenants as any
  const branch = room   ? (Array.isArray(room.branch)   ? room.branch[0]   : room.branch)   : null
  const user   = tenant ? (Array.isArray(tenant.user)   ? tenant.user[0]   : tenant.user)   : null

  const inv = {
    id:           raw.id,
    code:         raw.invoice_code as string,
    totalAmount:  raw.total_amount  as number,
    status:       raw.payment_status as string,
    issuedAt:     raw.issued_at     as string | null,
    dueDate:      raw.due_date      as string | null,
    createdAt:    raw.created_at    as string | null,
    paidAt:       (raw as any).paid_at ?? null,
    roomPrice:    (raw.room_price    as number) ?? 0,
    serviceCost:  (raw.service_cost  as number) ?? 0,
    electricCost: (raw.electric_cost as number) ?? 0,
    waterCost:    (raw.water_cost    as number) ?? 0,
    repairCost:   ((raw as any).repair_cost as number) ?? 0,
    electricOld:  raw.electric_old  as number | null,
    electricNew:  raw.electric_new  as number | null,
    waterOld:     raw.water_old     as number | null,
    waterNew:     raw.water_new     as number | null,
    room:    room   ? { id: room.id, roomCode: room.room_code, floor: room.floor, basePrice: room.base_price, branchName: branch?.name ?? '—' } : null,
    tenant:  user   ? { id: tenant.id, fullName: user.full_name, phone: user.phone, email: user.email } : null,
  }

  // Tickets sửa chữa gắn với HĐ này
  const { data: repairTickets } = await adminSupabase
    .from('maintenance_tickets')
    .select('id, title, repair_cost, created_at')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })

  // InvoiceActions cần shape này
  const invoiceForActions = {
    id:      inv.id,
    code:    inv.code,
    room:    inv.room?.roomCode ?? '—',
    tenant:  inv.tenant?.fullName ?? 'Khách vãng lai',
    date:    fmtDate(inv.issuedAt),
    dueDate: inv.dueDate ?? '',
    amount:  inv.totalAmount,
    status:  inv.status,
  }

  const hasElectric = inv.electricOld !== null && inv.electricNew !== null
  const hasWater    = inv.waterOld    !== null && inv.waterNew    !== null

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Breadcrumb + back ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-500 hover:text-gray-700 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Hóa đơn</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">{inv.code}</span>
        </div>

        {/* ── Header card ────────────────────────────────────────────────── */}
        <Card className="border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-teal-100 text-sm font-medium mb-1">Mã hóa đơn</p>
                <h1 className="text-white text-2xl font-extrabold tracking-wide">{inv.code}</h1>
                {inv.room && (
                  <p className="text-teal-100 text-sm mt-1">
                    Phòng {inv.room.roomCode}
                    {inv.room.branchName !== '—' && ` · ${inv.room.branchName}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={inv.status} dueDate={inv.dueDate} />
                <p className="text-white text-3xl font-extrabold">{fmt(inv.totalAmount)}</p>
              </div>
            </div>
          </div>

          {/* Dates strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
            {[
              { label: 'Ngày lập',    value: fmtDate(inv.issuedAt),  icon: Receipt },
              { label: 'Hạn thanh toán', value: fmtDate(inv.dueDate), icon: Calendar },
              { label: 'Đã thanh toán', value: inv.paidAt ? fmtDatetime(inv.paidAt) : '—', icon: CheckCircle2 },
              { label: 'Tạo lúc',     value: fmtDatetime(inv.createdAt), icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="px-4 py-3">
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                  <Icon className="h-3 w-3" />{label}
                </p>
                <p className="text-sm font-semibold text-gray-700">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Cột trái: Breakdown + Tickets ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Breakdown chi phí */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-teal-600" />
                    Chi tiết các khoản phí
                  </h2>
                </div>

                <div className="divide-y divide-gray-50">
                  {/* Tiền phòng */}
                  <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Home className="h-4 w-4 text-teal-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Tiền phòng</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800">{fmt(inv.roomPrice)}</span>
                  </div>

                  {/* Tiền điện */}
                  {(inv.electricCost > 0 || hasElectric) && (
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Tiền điện</p>
                          {hasElectric && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {inv.electricOld} → {inv.electricNew} kWh
                              ({((inv.electricNew ?? 0) - (inv.electricOld ?? 0)).toLocaleString()} kWh)
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{fmt(inv.electricCost)}</span>
                    </div>
                  )}

                  {/* Tiền nước */}
                  {(inv.waterCost > 0 || hasWater) && (
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Droplets className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Tiền nước</p>
                          {hasWater && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {inv.waterOld} → {inv.waterNew} m³
                              ({((inv.waterNew ?? 0) - (inv.waterOld ?? 0)).toLocaleString()} m³)
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{fmt(inv.waterCost)}</span>
                    </div>
                  )}

                  {/* Dịch vụ */}
                  {inv.serviceCost > 0 && (
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                          <ConciergeBell className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Dịch vụ cố định</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{fmt(inv.serviceCost)}</span>
                    </div>
                  )}

                  {/* Sửa chữa */}
                  {inv.repairCost > 0 && (
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                          <Wrench className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Chi phí sửa chữa</span>
                      </div>
                      <span className="text-sm font-bold text-red-600">{fmt(inv.repairCost)}</span>
                    </div>
                  )}

                  {/* Tổng */}
                  <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80">
                    <span className="text-sm font-bold text-gray-800">Tổng cộng</span>
                    <span className="text-lg font-extrabold text-teal-700">{fmt(inv.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tickets sửa chữa */}
            {repairTickets && repairTickets.length > 0 && (
              <Card className="border-gray-100 shadow-sm">
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-red-500" />
                      Phiếu sửa chữa đính kèm
                      <Badge variant="outline" className="ml-1 text-xs">{repairTickets.length}</Badge>
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {(repairTickets as any[]).map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{t.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(t.created_at)}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600">{fmt(t.repair_cost ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Cột phải: Thông tin phòng, khách, thanh toán ───────────── */}
          <div className="space-y-6">

            {/* Phòng */}
            {inv.room && (
              <Card className="border-gray-100 shadow-sm">
                <CardContent className="p-0">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-teal-600" />
                      Thông tin phòng
                    </h2>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <Row label="Phòng"      value={`Phòng ${inv.room.roomCode}`} />
                    <Row label="Tầng"       value={`Tầng ${inv.room.floor}`} />
                    <Row label="Chi nhánh"  value={inv.room.branchName} />
                    {inv.room.basePrice > 0 && (
                      <Row label="Giá thuê" value={fmt(inv.room.basePrice)} />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Khách thuê */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-0">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-500" />
                    Khách thuê
                  </h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {inv.tenant ? (
                    <>
                      <Row label={<><User className="h-3 w-3 inline mr-1" />Họ tên</>} value={inv.tenant.fullName} />
                      <Row label={<><Phone className="h-3 w-3 inline mr-1" />Điện thoại</>} value={inv.tenant.phone ?? '—'} />
                      <Row label={<><Mail className="h-3 w-3 inline mr-1" />Email</>} value={inv.tenant.email ?? '—'} />
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Chưa gắn khách thuê</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Thanh toán */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-0">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    Thông tin thanh toán
                  </h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {(raw as any).payment_account_name && (
                    <Row label="Chủ tài khoản" value={(raw as any).payment_account_name} />
                  )}
                  {(raw as any).payment_account_number && (
                    <Row label="Số tài khoản" value={(raw as any).payment_account_number} />
                  )}
                  {(raw as any).payment_description && (
                    <Row label="Nội dung CK" value={(raw as any).payment_description} />
                  )}
                  {!(raw as any).payment_account_name && !(raw as any).payment_account_number && (
                    <p className="text-sm text-gray-400 italic">Chưa có thông tin thanh toán</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-5 flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 mb-1">Thao tác</p>
                <InvoiceActions invoice={invoiceForActions} showLabel />
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-gray-700 text-right">{value}</span>
    </div>
  )
}
