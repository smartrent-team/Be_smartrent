import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { CreateBranchDialog } from './_components/CreateBranchDialog'
import { DeleteBranchButton } from './_components/DeleteBranchButton'
import { EditBranchDialog } from './_components/EditBranchDialog'
import { Building2, ShieldAlert, Home, UserCheck, Percent, Phone, MapPin } from 'lucide-react'

export default async function BranchesPage() {
  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  // 1. Fetch branches
  const { data: rawBranches } = await adminSupabase
    .from('branches')
    .select('*')
    .order('created_at', { ascending: false })
  const branches = rawBranches || []

  // 2. Fetch rooms to calculate total rooms and occupancy rate per branch
  const { data: rawRooms } = await adminSupabase
    .from('rooms')
    .select('id, branch_id, status')
  const rooms = rawRooms || []

  // 3. Fetch managers to map responsible manager per branch
  const { data: rawManagers } = await adminSupabase
    .from('users')
    .select('id, full_name, phone, branch_id')
    .eq('role', 'manager')
    .eq('status', 'active')
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
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tỷ lệ lấp đầy TB</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{averageOccupancy}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content table */}
      <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm overflow-hidden">
        {branchStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-slate-50 p-4 text-slate-400 mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Chưa có chi nhánh nào</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              Hãy nhấn nút &ldquo;Thêm chi nhánh&rdquo; phía trên để tạo chi nhánh đầu tiên.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-[260px] font-semibold text-gray-600">Tên chi nhánh</TableHead>
                  <TableHead className="w-[300px] font-semibold text-gray-600">Địa chỉ & Liên hệ</TableHead>
                  <TableHead className="font-semibold text-gray-600">Manager phụ trách</TableHead>
                  <TableHead className="font-semibold text-gray-600">Số phòng</TableHead>
                  <TableHead className="font-semibold text-gray-600">Tỷ lệ lấp đầy</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold text-gray-600">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchStats.map((branch) => (
                  <TableRow key={branch.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                    <TableCell className="font-medium text-gray-900 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-inner uppercase">
                          {branch.name.slice(0, 2)}
                        </div>
                        <div>
                          <span className="block font-semibold text-base">{branch.name}</span>
                          {branch.description && (
                            <span className="block text-xs text-gray-400 font-normal mt-0.5 line-clamp-1">
                              {branch.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        {branch.address ? (
                          <div className="flex items-start gap-1.5 text-gray-700">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{branch.address}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Chưa cập nhật địa chỉ</span>
                        )}
                        {branch.phone && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {branch.managers.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {branch.managers.map((m: { id: string; full_name: string | null; phone: string | null; branch_id: number | null }) => (
                            <div key={m.id} className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-teal-600" />
                              <span className="text-sm font-semibold text-teal-800">{m.full_name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Chưa có manager</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-base font-bold text-gray-800">{branch.totalRooms}</span>
                        <span className="text-xs text-gray-400">phòng</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1.5 w-24">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-700">{branch.occupancyRate}%</span>
                          <span className="text-gray-400 font-normal">({branch.occupiedRooms}/{branch.totalRooms})</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              branch.occupancyRate > 75
                                ? 'bg-emerald-500'
                                : branch.occupancyRate > 40
                                ? 'bg-teal-500'
                                : branch.occupancyRate > 0
                                ? 'bg-amber-500'
                                : 'bg-gray-300'
                            }`}
                            style={{ width: `${branch.occupancyRate}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <EditBranchDialog branch={branch} />
                        <DeleteBranchButton id={branch.id} name={branch.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
