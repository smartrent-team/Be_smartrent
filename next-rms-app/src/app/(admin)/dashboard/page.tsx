import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import DashboardStats from "./_components/DashboardStats"
import RecentActivities from "./_components/RecentActivities"
import PendingTickets from "./_components/PendingTickets"

// Skeletons cho loading state
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

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-muted-foreground mt-2">Theo dõi tình hình kinh doanh nhà trọ của bạn trong tháng này.</p>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Recent Activities & Tickets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
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
