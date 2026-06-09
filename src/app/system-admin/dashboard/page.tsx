import PlatformStats from './_components/PlatformStats'
import PlatformRevenueChart from './_components/PlatformRevenueChart'
import TopOrganizations from './_components/TopOrganizations'

export default function MasterAdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tổng quan Nền tảng (Master Admin)</h1>
        <p className="text-muted-foreground mt-1">
          Theo dõi các chỉ số tăng trưởng, luân chuyển dòng tiền và số lượng người dùng của toàn bộ hệ thống B2B2C.
        </p>
      </div>

      {/* Row 1: 4 KPIs */}
      <PlatformStats />

      {/* Row 2: Charts and Top Lists */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <PlatformRevenueChart />
        </div>
        <div className="lg:col-span-3">
          <TopOrganizations />
        </div>
      </div>
    </div>
  )
}
