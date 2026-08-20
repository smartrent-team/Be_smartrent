import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { CreateManagerDialog } from './_components/CreateManagerDialog'
import ManagerListClient, { type ManagerUser } from './_components/ManagerListClient'
import { Users, Building } from 'lucide-react'

export default async function ManagersPage() {
  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  // 1. Fetch branches and managers in parallel
  const [
    { data: rawBranches },
    { data: rawManagers }
  ] = await Promise.all([
    adminSupabase
      .from('branches')
      .select('id, name')
      .order('name'),
    adminSupabase
      .from('users')
      .select('id, full_name, phone, email, role, branch_id')
      .eq('role', 'manager')
      .eq('status', 'active')
  ])

  const branches = rawBranches || []
  const managers = (rawManagers as unknown as ManagerUser[]) || []

  // Stats calculation
  const totalManagers = managers.length
  const assignedManagers = managers.filter(m => m.branch_id !== null).length

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Tài khoản Quản lý
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Tạo tài khoản và phân công quản lý chi nhánh cho các Manager.
          </p>
        </div>
        <CreateManagerDialog branches={branches} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng số Manager</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalManagers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Đã gán chi nhánh</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{assignedManagers}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content table with filters */}
      <ManagerListClient initialManagers={managers} branches={branches} />
    </div>
  )
}
