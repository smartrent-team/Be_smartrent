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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateServiceDialog } from './_components/CreateServiceDialog'
import { DeleteServiceButton } from './_components/DeleteServiceButton'
import { EditServiceDialog } from './_components/EditServiceDialog'
import { BranchPricingDialog } from './_components/BranchPricingDialog'
import { BranchPricingCell } from './_components/BranchPricingCell'
import {
  ConciergeBell,
  ShieldAlert,
  PackageOpen,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Gauge,
  DoorOpen,
  User,
  Hash,
} from 'lucide-react'

// ─── Helper: badge loại dịch vụ ───────────────────────────────────────────
function ServiceTypeBadge({ type }: { type: string | null }) {
  if (type === 'metered') {
    return (
      <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-xs font-medium gap-1 shrink-0">
        <Gauge className="h-3 w-3" />
        Theo chỉ số
      </Badge>
    )
  }
  return (
    <Badge className="bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-50 text-xs font-medium gap-1 shrink-0">
      <CalendarClock className="h-3 w-3" />
      Cố định
    </Badge>
  )
}

// ─── Helper: badge cách tính tiền ─────────────────────────────────────────
function BillingTypeBadge({ type }: { type: string | null }) {
  if (type === 'per_person') {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-xs font-medium gap-1 shrink-0">
        <User className="h-3 w-3" />
        Theo người
      </Badge>
    )
  }
  if (type === 'per_unit') {
    return (
      <Badge className="bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50 text-xs font-medium gap-1 shrink-0">
        <Hash className="h-3 w-3" />
        Theo số lượng
      </Badge>
    )
  }
  return (
    <Badge className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50 text-xs font-medium gap-1 shrink-0">
      <DoorOpen className="h-3 w-3" />
      Theo phòng
    </Badge>
  )
}

// ─── Helper: render một nhóm dịch vụ ─────────────────────────────────────
function ServiceGroup({
  label,
  icon,
  services,
  branches,
  branchServices,
  accentClass,
}: {
  label: string
  icon: React.ReactNode
  services: Record<string, unknown>[]
  branches: { id: number; name: string }[]
  branchServices: { service_id: number; branch_id: number; price: number; unit: string | null; is_active: boolean }[]
  accentClass: string
}) {
  if (services.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm overflow-hidden">
      {/* Group header */}
      <div className={`flex items-center gap-2 px-6 py-3 border-b border-gray-100 ${accentClass}`}>
        {icon}
        <span className="font-semibold text-sm">{label}</span>
        <span className="ml-auto text-xs font-medium opacity-60">{services.length} dịch vụ</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>
              <TableHead className="w-[220px] font-semibold text-gray-600">Tên dịch vụ</TableHead>
              <TableHead className="w-[130px] font-semibold text-gray-600">Cách tính</TableHead>
              <TableHead className="font-semibold text-gray-600">Mô tả</TableHead>
              <TableHead className="font-semibold text-gray-600">Giá theo chi nhánh</TableHead>
              <TableHead className="w-[120px] text-right font-semibold text-gray-600">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => {
              const pricings = branchServices.filter((bs) => bs.service_id === (service.id as number))
              return (
                <TableRow
                  key={service.id as number}
                  className="hover:bg-slate-50/50 transition-colors duration-150 align-top"
                >
                  {/* Tên */}
                  <TableCell className="py-4 font-medium text-gray-900">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner shrink-0">
                          <PackageOpen className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-base leading-snug">{service.name as string}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Cách tính */}
                  <TableCell className="py-4">
                    <BillingTypeBadge type={service.billing_type as string | null} />
                  </TableCell>

                  {/* Mô tả */}
                  <TableCell className="py-4 text-sm text-gray-500 max-w-[180px]">
                    {service.description ? (
                      <span className="line-clamp-2">{service.description as string}</span>
                    ) : (
                      <span className="italic text-gray-400">Chưa có mô tả</span>
                    )}
                  </TableCell>

                  {/* Giá theo chi nhánh */}
                  <TableCell className="py-4">
                    <BranchPricingCell pricings={pricings} branches={branches} />
                  </TableCell>

                  {/* Thao tác */}
                  <TableCell className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <BranchPricingDialog
                        service={{ id: service.id as number, name: service.name as string }}
                        branches={branches}
                        branchServices={pricings}
                      />
                      <EditServiceDialog
                        service={{
                          id: service.id as number,
                          name: service.name as string,
                          description: (service.description as string | null) ?? null,
                          service_type: (service.service_type as 'fixed' | 'variable') ?? 'fixed',
                          billing_type: (service.billing_type as 'per_room' | 'per_person' | 'per_unit') ?? 'per_room',
                        }}
                      />
                      <DeleteServiceButton id={service.id as number} name={service.name as string} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default async function ServicesPage() {
  const supabase = await createClient()
  await supabase.auth.getUser()

  const adminSupabase = createAdminClient()

  const [{ data: rawServices }, { data: rawBranches }, { data: rawBranchServices }] =
    await Promise.all([
      adminSupabase.from('services').select('*').order('created_at', { ascending: false }),
      adminSupabase.from('branches').select('id, name').order('name', { ascending: true }),
      adminSupabase.from('branch_services').select('service_id, branch_id, price, unit, is_active'),
    ])

  const services = rawServices || []
  const branches = rawBranches || []
  const branchServices = rawBranchServices || []

  const fixedServices   = services.filter((s) => s.service_type === 'fixed')
  const meteredServices = services.filter((s) => s.service_type === 'metered')

  const totalServices = services.length
  const fixedCount   = fixedServices.length
  const meteredCount = meteredServices.length

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Quản lý Dịch Vụ
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Quản lý danh mục dịch vụ cố định và không cố định, cấu hình giá riêng cho từng chi nhánh.
          </p>
        </div>
        <CreateServiceDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <ConciergeBell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng dịch vụ</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalServices}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cố định</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{fixedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Theo chỉ số</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{meteredCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {services.length === 0 && (
        <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm flex flex-col items-center justify-center p-12 text-center">
          <div className="rounded-full bg-slate-50 p-4 text-slate-400 mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">Chưa có dịch vụ nào</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            Nhấn &ldquo;Thêm dịch vụ&rdquo; để tạo dịch vụ đầu tiên.
          </p>
        </div>
      )}

      {/* Group: Cố định */}
      <ServiceGroup
        label="Dịch vụ Cố định"
        icon={<CalendarClock className="h-4 w-4 text-teal-600" />}
        services={fixedServices}
        branches={branches}
        branchServices={branchServices}
        accentClass="bg-teal-50/60 text-teal-800"
      />

      {/* Group: Theo chỉ số */}
      <ServiceGroup
        label="Dịch vụ Theo chỉ số (Điện, Nước)"
        icon={<Gauge className="h-4 w-4 text-blue-600" />}
        services={meteredServices}
        branches={branches}
        branchServices={branchServices}
        accentClass="bg-blue-50/60 text-blue-800"
      />
    </div>
  )
}
