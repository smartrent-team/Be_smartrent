import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { verifyRole } from '@/lib/rbac'
import DashboardStats from "./_components/DashboardStats"
import SubscriptionWrapper from "./_components/SubscriptionWrapper"
import RecentActivities from "./_components/RecentActivities"
import PendingTickets from "./_components/PendingTickets"
import RevenueChart from "./_components/RevenueChart"
import ChainOverviewStats from "./_components/ChainOverviewStats"
import BranchComparisonCharts from "./_components/BranchComparisonCharts"
import { ChainOverviewChart } from "./_components/ChainOverviewChart"
import TopBranches from "./_components/TopBranches"

import { DashboardService } from "@/services/dashboard.service"
import type { AnalyticsData } from "@/services/dashboard.service"

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
  const { supabase, organizationId } = await verifyRole()
  if (!organizationId) return <div className="text-red-500">No organization found</div>

  const resultData = await DashboardService.getChainAnalytics({
    supabase,
    organizationId
  })

  if (!resultData) {
    return <div className="text-red-500">Failed to load analytics data</div>
  }

  return renderAnalytics(resultData)
}

function renderAnalytics(data: AnalyticsData) {
  const { chainStats, chainOverviewData, branchKPIs, best, worst } = data;

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

      <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
        <SubscriptionWrapper />
      </Suspense>

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
