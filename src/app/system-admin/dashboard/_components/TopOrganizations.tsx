import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from '@/lib/supabase/admin'
import { redis } from '@/lib/redis'
import { Building2, Users } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

export default async function TopOrganizations() {
  const supabase = createAdminClient()
  const cacheKey = `master_admin:top_orgs`

  let orgs: any[] = []

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      orgs = typeof cached === 'string' ? JSON.parse(cached) : cached
    }
  } catch (err) {}

  if (orgs.length === 0) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, created_at, users(count), branches(count)')
      .order('created_at', { ascending: false })
      .limit(5)
    
    orgs = data || []

    try {
      await redis.set(cacheKey, JSON.stringify(orgs), { ex: 14400 }) // 4 hours
    } catch (err) {}
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-lg">Khách hàng mới nhất</CardTitle>
        <CardDescription>Các công ty/chủ trọ vừa tham gia nền tảng</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orgs.map((org: any) => (
            <div key={org.id} className="flex items-center justify-between p-4 rounded-lg border bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{org.name || 'Công ty chưa đặt tên'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tham gia: {new Date(org.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Chi nhánh</p>
                  <p className="font-semibold">{org.branches?.[0]?.count || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Tài khoản</p>
                  <p className="font-semibold">{org.users?.[0]?.count || 0}</p>
                </div>
              </div>
            </div>
          ))}
          {orgs.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Chưa có khách hàng nào</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
