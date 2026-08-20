import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { CreateBranchDialog } from './_components/CreateBranchDialog'
import BranchListClient, { type BranchWithStats } from './_components/BranchListClient'
import { Building2, Home, Users } from 'lucide-react'

export default async function BranchesPage() {
  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  // 1. Fetch data in parallel
  const [
    { data: rawBranches },
    { data: rawRooms },
    { data: rawManagers }
  ] = await Promise.all([
    adminSupabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('rooms')
      .select('id, branch_id, status'),
    adminSupabase
      .from('users')
      .select('id, full_name, phone, branch_id')
      .eq('role', 'manager')
      .eq('status', 'active')
  ])

  const branches = rawBranches || []
  const rooms = rawRooms || []
  const managers = rawManagers || []

  // Pre-calculate stats per branch
  const branchStats = branches.map((branch) => {
    const branchRooms = rooms.filter((r) => r.branch_id === branch.id)
    const totalRooms = branchRooms.length
    const occupiedRooms = branchRooms.filter((r) => r.status === 'occupied').length
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    const branchManagers = managers.filter((m) => m.branch_id === branch.id)

    return {
      ...branch,
      totalRooms,
      occupiedRooms,
      occupancyRate,
      managers: branchManagers,
    }
  })

  // Global branch stats
  const totalBranches = branches.length
  const totalRoomsCount = rooms.length
  const totalOccupiedCount = rooms.filter(r => r.status === 'occupied').length
  const averageOccupancy = totalRoomsCount > 0 ? Math.round((totalOccupiedCount / totalRoomsCount) * 100) : 0

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Quản lý Chi nhánh
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Quản lý danh sách chi nhánh nhà trọ, cấu hình phòng, và phân công Manager phụ trách.
          </p>
        </div>
        <CreateBranchDialog />
      </div>

      {/* Stats Dashboard */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng số chi nhánh</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalBranches}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng số phòng trọ</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalRoomsCount} phòng</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phòng đã có người ở</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {totalOccupiedCount}/{totalRoomsCount}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content with advanced filters */}
      <BranchListClient initialBranches={branchStats} />
    </div>
  )
}
