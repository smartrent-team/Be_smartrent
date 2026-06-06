import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, Users } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Thống kê đơn giản
  const [
    { count: totalOrgs },
    { count: totalUsers }
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true })
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tổng quan Hệ Thống (Master Admin)</h1>
        <p className="text-muted-foreground mt-1">Theo dõi các chỉ số tăng trưởng của nền tảng SaaS.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/system-admin/organizations" className="block transition-transform hover:scale-[1.02]">
          <div className="rounded-xl border bg-white text-card-foreground shadow-sm h-full">
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Tổng số Chủ Trọ</h3>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold">{totalOrgs || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Đang đăng ký trên hệ thống</p>
            </div>
          </div>
        </Link>

        <div className="rounded-xl border bg-white text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Tổng số Người Dùng</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Bao gồm Quản lý & Người thuê</p>
          </div>
        </div>
      </div>
    </div>
  )
}
