import { createClient } from '@/lib/supabase/server'
import { OrganizationList } from './_components/OrganizationList'

export default async function OrganizationsPage() {
  const supabase = await createClient()

  // Lấy danh sách organizations
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-6 text-red-500">Lỗi khi tải dữ liệu: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý Chủ Trọ (SaaS)</h1>
        <p className="text-muted-foreground mt-1">Danh sách tất cả các chủ trọ đang sử dụng phần mềm.</p>
      </div>

      <OrganizationList initialOrgs={orgs || []} />
    </div>
  )
}
