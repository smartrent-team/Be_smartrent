import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from '@/lib/supabase/admin'
import { redis } from '@/lib/redis'
import { TrendingUp } from 'lucide-react'
import { PlatformRevenueChartClient } from './PlatformRevenueChartClient'

export default async function PlatformRevenueChart() {
  const supabase = createAdminClient()

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}_${now.getMonth() + 1}`
  const cacheKey = `master_admin:platform_revenue_chart:${currentMonthStr}`

  let months: { month: string; revenue: number }[] = []

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      months = typeof cached === 'string' ? JSON.parse(cached) : cached
    }
  } catch (err) {}

  if (months.length === 0) {
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1)

      const { data } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('payment_status', 'paid')
        .gte('paid_at', date.toISOString())
        .lt('paid_at', nextDate.toISOString())

      const revenue = (data || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

      months.push({
        month: date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
        revenue,
      })
    }

    try {
      await redis.set(cacheKey, JSON.stringify(months), { ex: 14400 }) // 4 hours
    } catch (err) {}
  }

  const totalSixMonths = months.reduce((s, m) => s + m.revenue, 0)

  return (
    <Card className="hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Dòng tiền toàn nền tảng (6 tháng)
          </CardTitle>
          <CardDescription className="mt-1">
            Tổng giao dịch: <span className="font-semibold text-emerald-600">{(totalSixMonths / 1_000_000).toFixed(1)}M VNĐ</span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <PlatformRevenueChartClient data={months} />
      </CardContent>
    </Card>
  )
}
