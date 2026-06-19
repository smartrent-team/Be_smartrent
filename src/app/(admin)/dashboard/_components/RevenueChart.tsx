import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from '@/lib/supabase/admin'
import { RevenueChartClient } from './RevenueChartClient'
import { TrendingUp } from 'lucide-react'

export default async function RevenueChart() {
  const supabase = createAdminClient()

  // Lấy doanh thu 6 tháng gần nhất
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, paid_at')
    .eq('payment_status', 'paid')
    .gte('paid_at', sixMonthsAgo.toISOString())
    .lt('paid_at', nextMonth.toISOString())

  const months: { month: string; revenue: number }[] = Array.from({ length: 6 }, (_, idx) => {
    const i = 5 - idx
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    
    const rev = (invoices || [])
      .filter(inv => {
        if (!inv.paid_at) return false;
        const d = new Date(inv.paid_at)
        return d >= date && d < nextDate
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    return {
      month: date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
      revenue: rev,
    }
  })

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
