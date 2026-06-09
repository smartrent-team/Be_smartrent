import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Home, DollarSign } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { redis } from '@/lib/redis'
import Link from 'next/link'

export default async function PlatformStats() {
  const supabase = createAdminClient()
  const cacheKey = `master_admin:platform_stats`

  let statsData
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      statsData = typeof cached === 'string' ? JSON.parse(cached) : cached
    }
  } catch {}

  if (!statsData) {
    const [
      { count: totalOrgs },
      { count: totalUsers },
      { count: totalRooms },
      { count: activeTenants },
      { data: paidInvoices }
    ] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
      supabase.from('tenants').select('*', { count: 'exact', head: true }).is('move_out_date', null),
      supabase.from('invoices').select('total_amount').eq('payment_status', 'paid')
    ]);

    const gmv = (paidInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    statsData = {
      totalOrgs: totalOrgs || 0,
      totalUsers: totalUsers || 0,
      totalRooms: totalRooms || 0,
      activeTenants: activeTenants || 0,
      gmv: gmv
    }

    try {
      await redis.set(cacheKey, JSON.stringify(statsData), { ex: 14400 }) // Cache for 4 hours
    } catch {}
  }

  const stats = [
    { title: 'Tổng số Công ty (Orgs)', value: statsData.totalOrgs.toString(), icon: Building2, description: 'Chủ trọ đăng ký hệ thống', colorClass: 'text-blue-600', bgClass: 'bg-blue-100', href: '/system-admin/organizations' },
    { title: 'Khối lượng phòng (Rooms)', value: statsData.totalRooms.toString(), icon: Home, description: 'Phòng đang được quản lý', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-100', href: '#' },
    { title: 'Người dùng (Users)', value: statsData.totalUsers.toString(), icon: Users, description: `${statsData.activeTenants} Khách thuê active`, colorClass: 'text-violet-600', bgClass: 'bg-violet-100', href: '#' },
    { title: 'Dòng tiền giao dịch (GMV)', value: `${(statsData.gmv / 1_000_000).toFixed(1)}M`, icon: DollarSign, description: 'Toàn bộ hóa đơn đã thu', colorClass: 'text-amber-600', bgClass: 'bg-amber-100', href: '#' },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <Link href={stat.href} key={i} className={`block group ${stat.href === '#' ? 'pointer-events-none' : ''}`}>
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
