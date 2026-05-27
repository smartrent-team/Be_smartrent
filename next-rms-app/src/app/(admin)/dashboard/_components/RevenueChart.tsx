import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from '@/lib/supabase/admin'
import { RevenueChartClient } from './RevenueChartClient'
import { TrendingUp } from 'lucide-react'

export default async function RevenueChart() {
  const supabase = createAdminClient()

  // Lấy doanh thu 6 tháng gần nhất
  const months: { month: string; revenue: number }[] = []
  const now = new Date()

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
