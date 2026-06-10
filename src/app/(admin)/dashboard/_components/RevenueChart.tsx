import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { verifyRole } from '@/lib/rbac'
import { redis } from '@/infrastructure/redis'
import { RevenueChartClient } from './RevenueChartClient'
import { TrendingUp } from 'lucide-react'

export default async function RevenueChart() {
  const { supabase, organizationId } = await verifyRole()
  if (!organizationId) return null

  const now = new Date()
  const currentMonth = `${now.getFullYear()}_${now.getMonth() + 1}`
  const cacheKey = `dashboard_revenue_chart:${organizationId}:${currentMonth}`

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
      await redis.set(cacheKey, JSON.stringify(months), { ex: 43200 })
    } catch (err) {}
  }

  const totalSixMonths = months.reduce((s, m) => s + m.revenue, 0)

  return (
    <Card className="col-span-full hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Doanh thu 6 tháng gần nhất
          </CardTitle>
          <CardDescription className="mt-1">
            Tổng thu: <span className="font-semibold text-emerald-600">{(totalSixMonths / 1_000_000).toFixed(1)}M đ</span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <RevenueChartClient data={months} />
      </CardContent>
    </Card>
  )
}
