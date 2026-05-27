import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, DollarSign, FileWarning } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function DashboardStats() {
  const supabase = createAdminClient()

  const [
    { count: totalRoomsCount },
    { count: activeTenantsCount },
    { count: unpaidInvoicesCount },
    { data: paidInvoices }
  ] = await Promise.all([
    supabase.from('rooms').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).is('move_out_date', null),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).in('payment_status', ['unpaid', 'partial']),
    supabase
      .from('invoices')
      .select('total_amount')
      .eq('payment_status', 'paid')
      .gte('issued_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);
  
  const emptyRooms = (totalRoomsCount || 0) - (activeTenantsCount || 0)
  const revenueThisMonth = (paidInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

  const stats = [
    { title: 'Tổng số phòng', value: (totalRoomsCount || 0).toString(), icon: Home, description: 'Đang quản lý', colorClass: 'text-blue-600', bgClass: 'bg-blue-100', href: '/rooms' },
    { title: 'Phòng trống', value: (emptyRooms > 0 ? emptyRooms : 0).toString(), icon: Home, description: 'Cần tìm khách', colorClass: 'text-green-600', bgClass: 'bg-green-100', href: '/rooms?status=available' },
    { title: 'Doanh thu tháng', value: `${(revenueThisMonth / 1000000).toFixed(1)}M`, icon: DollarSign, description: 'Tháng hiện tại', colorClass: 'text-amber-600', bgClass: 'bg-amber-100', href: '/invoices?status=paid' },
    { title: 'Hoá đơn chưa thu', value: (unpaidInvoicesCount || 0).toString(), icon: FileWarning, description: 'Cần nhắc nhở', colorClass: 'text-red-600', bgClass: 'bg-red-100', href: '/invoices?status=unpaid' },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <Link href={stat.href} key={i} className="block group">
            <Card className="hover:-translate-y-1 hover:shadow-lg hover:border-primary/20 hover:bg-slate-50/50 cursor-pointer transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium transition-colors group-hover:text-primary">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgClass} transition-transform group-hover:scale-110 duration-300`}>
                  <Icon className={`h-4 w-4 ${stat.colorClass}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
