import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardRealtimeRefresher from "./_components/DashboardStatsClient"
import DashboardStats from "./_components/DashboardStats"
import RecentActivities from "./_components/RecentActivities"
import PendingTickets from "./_components/PendingTickets"
import RevenueChart from "./_components/RevenueChart"
import ChainOverviewStats from "./_components/ChainOverviewStats"
import BranchComparisonCharts from "./_components/BranchComparisonCharts"
import { ChainOverviewChart } from "./_components/ChainOverviewChart"
import TopBranches from "./_components/TopBranches"
import type { BranchKPI } from "./_components/BranchComparisonCharts"
import type { RankedBranch } from "./_components/TopBranches"
import type { ChainOverviewData } from "./_components/ChainOverviewChart"

// ─── Skeletons ────────────────────────────────────────────────────────
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow p-6 h-[350px] flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex-1 flex items-end gap-4 px-2">
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ height: `${20 + i * 15}%` }} />
        ))}
      </div>
    </div>
  )
}

function ActivitiesSkeleton() {
  return (
    <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow p-6">
      <Skeleton className="h-6 w-40 mb-2" />
      <Skeleton className="h-4 w-60 mb-6" />
      <div className="space-y-6">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-60" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TicketsSkeleton() {
  return (
    <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow p-6">
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-32 mb-6" />
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 pb-4 border-b last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ComparisonSkeleton() {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-6">
      <Skeleton className="h-6 w-56 mb-2" />
      <Skeleton className="h-4 w-72 mb-6" />
      <div className="flex gap-2 mb-6">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-lg" />)}
      </div>
      <div className="flex items-end gap-6 h-[300px] px-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="w-full rounded-t-lg" style={{ height: `${30 + i * 12}%` }} />
        ))}
      </div>
    </div>
  )
}

function TopBranchesSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[0, 1].map(col => (
        <div key={col} className="rounded-2xl border bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Data Fetching Component (Server) ─────────────────────────────────
async function ChainAnalytics() {
  const supabase = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  // Fetch all data in parallel
  const [
    { data: branches },
    { data: rooms },
    { data: invoicesThisMonth },
    { data: unpaidInvoices },
  ] = await Promise.all([
    supabase.from('branches').select('id, name').order('name'),
    supabase.from('rooms').select('id, branch_id, status, area, base_price'),
    supabase
      .from('invoices')
      .select('room_id, total_amount, payment_status, electric_cost, water_cost')
      .gte('issued_at', monthStart)
      .lt('issued_at', monthEnd),
    supabase
      .from('invoices')
      .select('room_id, total_amount')
      .in('payment_status', ['unpaid', 'partial']),
  ])

  const branchList = branches || []
  const roomList = rooms || []
  const monthInvoices = invoicesThisMonth || []
  const debtInvoices = unpaidInvoices || []

  // Build roomId → branchId map
  const roomBranchMap = new Map<number, number>()
  const roomAreaMap = new Map<number, number>()
  for (const r of roomList) {
    if (r.branch_id) roomBranchMap.set(r.id, r.branch_id)
    roomAreaMap.set(r.id, r.area || 0)
  }

  // ─── Chain-wide stats ───────────────────────────────────────
  const totalRevenue = monthInvoices
    .filter((inv) => inv.payment_status === 'paid')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

  const totalRooms = roomList.length
  const occupiedRooms = roomList.filter((r) => r.status === 'occupied').length
  const avgOccupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  const totalDebt = debtInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

  const chainStats = {
    totalRevenue,
    avgOccupancyRate: avgOccupancy,
    totalDebt,
    totalBranches: branchList.length,
    occupiedRooms,
    totalRooms,
  }

  // ─── Per-branch KPIs ────────────────────────────────────────
  const branchKPIs: BranchKPI[] = branchList.map((branch) => {
    const branchRooms = roomList.filter((r) => r.branch_id === branch.id)
    const totalArea = branchRooms.reduce((sum, r) => sum + (r.area || 0), 0)
    const branchOccupied = branchRooms.filter((r) => r.status === 'occupied').length
    const branchOccupancy = branchRooms.length > 0
      ? Math.round((branchOccupied / branchRooms.length) * 100)
      : 0

    // Room IDs in this branch
    const branchRoomIds = new Set(branchRooms.map((r) => r.id))

    // Revenue for this branch (paid invoices this month)
    const branchRevenue = monthInvoices
      .filter((inv) => branchRoomIds.has(inv.room_id) && inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    // Revenue per m²
    const revenuePerSqm = totalArea > 0 ? Math.round(branchRevenue / totalArea) : 0

    // Bad debt (unpaid/partial)
    const branchDebt = debtInvoices
      .filter((inv) => branchRoomIds.has(inv.room_id))
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    // Utility costs this month
    const utilityCost = monthInvoices
      .filter((inv) => branchRoomIds.has(inv.room_id))
      .reduce((sum, inv) => sum + (inv.electric_cost || 0) + (inv.water_cost || 0), 0)

    return {
      name: branch.name,
      revenuePerSqm,
      occupancyRate: branchOccupancy,
      badDebt: branchDebt,
      utilityCost,
    }
  })

  // ─── Top 3 best / worst (composite score) ───────────────────
  // Composite = 50% revenue rank + 50% occupancy rank (normalized)
  const maxRevenue = Math.max(...branchKPIs.map(b => b.revenuePerSqm), 1)
  const maxOccupancy = Math.max(...branchKPIs.map(b => b.occupancyRate), 1)

  const scored: RankedBranch[] = branchKPIs.map((b) => ({
    name: b.name,
    score: Math.round(
      (b.revenuePerSqm / maxRevenue) * 50 + (b.occupancyRate / maxOccupancy) * 50
    ),
    revenue: monthInvoices
      .filter((inv) => {
        const roomId = inv.room_id
        const bid = roomBranchMap.get(roomId)
        return bid === branchList.find(br => br.name === b.name)?.id && inv.payment_status === 'paid'
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
    occupancyRate: b.occupancyRate,
  }))

  const sortedByScore = [...scored].sort((a, b) => b.score - a.score)
  const best = sortedByScore.slice(0, 3)
  const worst = sortedByScore.length > 3
    ? [...sortedByScore].reverse().slice(0, 3)
    : []

  // ─── Chain overview chart (6 months) ────────────────────────
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const { data: sixMonthsInvoices } = await supabase
    .from('invoices')
    .select('total_amount, paid_at')
    .eq('payment_status', 'paid')
    .gte('paid_at', sixMonthsAgo.toISOString())
    .lt('paid_at', nextMonth.toISOString())

  const chainOverviewData: ChainOverviewData[] = Array.from({ length: 6 }, (_, idx) => {
    const i = 5 - idx
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    
    const rev = (sixMonthsInvoices || [])
      .filter(inv => {
        if (!inv.paid_at) return false;
        const d = new Date(inv.paid_at)
        return d >= date && d < nextDate
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    return {
      month: date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
      revenue: rev,
      occupancyRate: avgOccupancy,
    }
  })

  // Override current month with actual occupancy
  if (chainOverviewData.length > 0) {
    chainOverviewData[chainOverviewData.length - 1].occupancyRate = avgOccupancy
  }

  return (
    <>
      {/* Chain-wide Overview Stats */}
      <ChainOverviewStats stats={chainStats} />

      {/* Chain Overview Chart — Revenue + Occupancy combined */}
      <div className="mt-6">
        <ChainOverviewChart data={chainOverviewData} />
      </div>

      {/* Branch Comparison Charts */}
      <div className="mt-6">
        <BranchComparisonCharts data={branchKPIs} />
      </div>

      {/* Top 3 Best / Worst */}
      <div className="mt-6">
        <TopBranches best={best} worst={worst} />
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-muted-foreground mt-2">Theo dõi tình hình kinh doanh nhà trọ của bạn trong tháng này.</p>
      </div>

      {/* Original Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Revenue Chart */}
      <div className="mt-2">
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueChart />
        </Suspense>
      </div>

      {/* ═══ NEW: Chain Analytics Section ═══ */}
      <div className="mt-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">
            Phân tích toàn chuỗi
          </h2>
          <p className="text-sm text-muted-foreground mt-1">So sánh hiệu quả các tòa nhà — phát hiện vấn đề nhanh chóng</p>
        </div>
        <Suspense fallback={
          <div className="space-y-6">
            <StatsSkeleton />
            <ChartSkeleton />
            <ComparisonSkeleton />
            <TopBranchesSkeleton />
          </div>
        }>
          <ChainAnalytics />
        </Suspense>
      </div>

      {/* Recent Activities & Tickets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Suspense fallback={<ActivitiesSkeleton />}>
          <RecentActivities />
        </Suspense>
        
        <Suspense fallback={<TicketsSkeleton />}>
          <PendingTickets />
        </Suspense>
      </div>
    </div>
  )
}
