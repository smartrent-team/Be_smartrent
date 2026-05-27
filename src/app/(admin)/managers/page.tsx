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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CreateManagerDialog } from './_components/CreateManagerDialog'
import { EditManagerDialog } from './_components/EditManagerDialog'
import { DeleteManagerButton } from './_components/DeleteManagerButton'
import { ShieldAlert, Users, Building, Phone, Clock, AlertCircle } from 'lucide-react'

export default async function ManagersPage() {
  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  // 1. Fetch branches for selector and mapping
  const { data: rawBranches } = await adminSupabase
    .from('branches')
    .select('id, name')
    .order('name')
  const branches = rawBranches || []

  // Create a map for quick branch lookup
  const branchMap = new Map<number, string>()
  branches.forEach((b) => branchMap.set(b.id, b.name))

  // 2. Fetch managers
  const { data: rawManagers } = await adminSupabase
    .from('users')
    .select('id, full_name, phone, role, branch_id')
    .eq('role', 'manager')

  const managers = rawManagers || []

  // Stats calculation
  const totalManagers = managers.length
  const assignedManagers = managers.filter(m => m.branch_id !== null).length
  const unassignedManagers = totalManagers - assignedManagers

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Quản lý Manager
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Tạo tài khoản và phân công quản lý chi nhánh cho các Manager.
          </p>
        </div>
        <CreateManagerDialog branches={branches} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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

        <Card className="border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chưa có chi nhánh</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{unassignedManagers}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content table */}
      <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm overflow-hidden">
        {managers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-slate-50 p-4 text-slate-400 mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Chưa có tài khoản Manager</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              Hãy nhấn nút &ldquo;Thêm Manager&rdquo; phía trên để tạo tài khoản đầu tiên phục vụ vận hành.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-[280px] font-semibold text-gray-600">Họ và tên</TableHead>
                  <TableHead className="font-semibold text-gray-600">Liên hệ (SĐT)</TableHead>
                  <TableHead className="font-semibold text-gray-600">Chi nhánh phụ trách</TableHead>
                  <TableHead className="font-semibold text-gray-600">Vai trò</TableHead>
                  <TableHead className="font-semibold text-gray-600">Trạng thái</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold text-gray-600">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((manager) => {
                  const branchName = manager.branch_id ? branchMap.get(manager.branch_id) : null
                  return (
                    <TableRow key={manager.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                      <TableCell className="font-medium text-gray-900 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm shadow-inner uppercase">
                            {manager.full_name?.slice(0, 2) || 'MN'}
                          </div>
                          <div>
                            <span className="block font-semibold">{manager.full_name || 'Chưa đặt tên'}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" /> ID: {String(manager.id).slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 py-4">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm font-medium">{manager.phone || 'Chưa cập nhật'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {branchName ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-semibold text-emerald-800">{branchName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Chưa gán chi nhánh</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-slate-50 border-gray-200 text-slate-600 font-medium">
                          Manager
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 font-semibold rounded-full px-2.5 py-0.5">
                          Hoạt động
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex items-center justify-end gap-1">
                          <EditManagerDialog manager={manager} branches={branches} />
                          <DeleteManagerButton id={manager.id} name={manager.full_name || 'Manager'} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
