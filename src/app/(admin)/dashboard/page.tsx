import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardClientView from './_components/DashboardClientView'

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center p-5 rounded-2xl border bg-white shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white shadow p-5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Main Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border bg-white shadow-sm p-6 h-[340px]">
          <Skeleton className="h-6 w-56 mb-4" />
          <Skeleton className="h-[240px] w-full rounded-xl" />
        </div>
        <div className="lg:col-span-5 rounded-2xl border bg-white shadow-sm p-6 h-[340px]">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-[240px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

async function DashboardDataLoader() {
  const supabase = createAdminClient()

  // Fetch all necessary dashboard data in parallel
  const [
    { data: branches },
    { data: rooms },
    { data: invoices },
    { data: contracts },
    { data: tickets },
    { data: tenants },
  ] = await Promise.all([
    supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true }),

    supabase
      .from('rooms')
      .select('id, branch_id, room_code, status, area, base_price, floor')
      .order('room_code', { ascending: true }),

    supabase
      .from('invoices')
      .select(`
        id,
        room_id,
        total_amount,
        payment_status,
        issued_at,
        paid_at,
        due_date,
        room_price,
        electric_cost,
        water_cost,
        service_cost,
        repair_cost,
        invoice_code
      `)
      .order('issued_at', { ascending: false }),

    supabase
      .from('contracts')
      .select(`
        id,
        room_id,
        tenant_id,
        start_date,
        end_date,
        deposit_amount,
        status,
        tenants (
          user:users (
            full_name,
            phone
          )
        )
      `)
      .eq('status', 'active'),

    supabase
      .from('maintenance_tickets')
      .select(`
        id,
        room_id,
        title,
        priority,
        status,
        created_at,
        rooms (
          room_code,
          branch_id
        )
      `)
      .in('status', ['pending', 'in-progress'])
      .order('created_at', { ascending: false }),

    supabase
      .from('tenants')
      .select('id, user_id, room_id, move_out_date')
      .is('move_out_date', null),
  ])

  // Normalize contracts tenant user data
  const normalizedContracts = (contracts || []).map((c: any) => {
    const tenant = Array.isArray(c.tenants) ? c.tenants[0] : c.tenants
    const user = tenant ? (Array.isArray(tenant.user) ? tenant.user[0] : tenant.user) : null
    return {
      id: c.id,
      room_id: c.room_id,
      tenant_id: c.tenant_id,
      start_date: c.start_date,
      end_date: c.end_date,
      deposit_amount: c.deposit_amount,
      status: c.status,
      tenants: user ? { user } : null,
    }
  })

  // Normalize tickets room data
  const normalizedTickets = (tickets || []).map((t: any) => {
    const room = Array.isArray(t.rooms) ? t.rooms[0] : t.rooms
    return {
      id: t.id,
      room_id: t.room_id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      created_at: t.created_at,
      rooms: room ? { room_code: room.room_code, branch_id: room.branch_id } : null,
    }
  })

  return (
    <DashboardClientView
      branches={branches || []}
      rooms={rooms || []}
      invoices={invoices || []}
      contracts={normalizedContracts}
      tickets={normalizedTickets}
      tenants={tenants || []}
    />
  )
}

export default function DashboardPage() {
  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader />
      </Suspense>
    </div>
  )
}
