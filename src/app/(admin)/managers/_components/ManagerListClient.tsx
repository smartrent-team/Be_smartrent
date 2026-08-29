'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EditManagerDialog } from './EditManagerDialog'
import { DeleteManagerButton } from './DeleteManagerButton'
import {
  Search,
  X,
  Phone,
  Mail,
  Clock,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Building,
  UserCheck,
  UserX,
} from 'lucide-react'

export interface ManagerUser {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: string
  branch_id: number | null
}

export interface BranchItem {
  id: number
  name: string
}

interface ManagerListClientProps {
  initialManagers: ManagerUser[]
  branches: BranchItem[]
}

export default function ManagerListClient({
  initialManagers,
  branches,
}: ManagerListClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'branch-asc'>('default')

  const branchMap = useMemo(() => {
    const map = new Map<number, string>()
    branches.forEach((b) => map.set(b.id, b.name))
    return map
  }, [branches])

  const filteredManagers = useMemo(() => {
    let result = [...initialManagers]

    // 1. Text search (Name, Phone, Email)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((m) => {
        const nameMatch = m.full_name ? m.full_name.toLowerCase().includes(q) : false
        const phoneMatch = m.phone ? m.phone.toLowerCase().includes(q) : false
        const emailMatch = m.email ? m.email.toLowerCase().includes(q) : false
        const branchName = m.branch_id ? branchMap.get(m.branch_id) : null
        const branchMatch = branchName ? branchName.toLowerCase().includes(q) : false
        return nameMatch || phoneMatch || emailMatch || branchMatch
      })
    }

    // 2. Assignment Filter (all / assigned / unassigned)
    if (assignmentFilter === 'assigned') {
      result = result.filter((m) => m.branch_id !== null)
    } else if (assignmentFilter === 'unassigned') {
      result = result.filter((m) => m.branch_id === null)
    }

    // 3. Specific Branch filter
    if (selectedBranchId !== 'all') {
      if (selectedBranchId === 'unassigned') {
        result = result.filter((m) => m.branch_id === null)
      } else {
        const branchIdNum = parseInt(selectedBranchId, 10)
        result = result.filter((m) => m.branch_id === branchIdNum)
      }
    }

    // 4. Sorting
    if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'vi'))
    } else if (sortBy === 'branch-asc') {
      result.sort((a, b) => {
        const bA = a.branch_id ? branchMap.get(a.branch_id) || '' : 'ZZZ'
        const bB = b.branch_id ? branchMap.get(b.branch_id) || '' : 'ZZZ'
        return bA.localeCompare(bB, 'vi')
      })
    }

    return result
  }, [initialManagers, searchQuery, assignmentFilter, selectedBranchId, sortBy, branchMap])

  const hasActiveFilters =
    searchQuery !== '' ||
    assignmentFilter !== 'all' ||
    selectedBranchId !== 'all' ||
    sortBy !== 'default'

  const handleResetFilters = () => {
    setSearchQuery('')
    setAssignmentFilter('all')
    setSelectedBranchId('all')
    setSortBy('default')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar & Filters ── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm theo họ tên, SĐT, Email Manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 rounded-xl border-gray-200 bg-slate-50/50 focus:bg-white transition-all text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Select & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Assignment Filter */}
            <div className="flex items-center rounded-xl bg-slate-100/80 p-1 text-xs">
              <button
                type="button"
                onClick={() => setAssignmentFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  assignmentFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('assigned')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  assignmentFilter === 'assigned'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Đã gán CN
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('unassigned')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  assignmentFilter === 'unassigned'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <UserX className="h-3.5 w-3.5" />
                Chưa gán CN
              </button>
            </div>

            {/* Branch dropdown */}
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              aria-label="Lọc theo chi nhánh phụ trách"
              className="h-10 rounded-xl border border-gray-200 bg-slate-50/50 px-3 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả chi nhánh</option>
              <option value="unassigned">Chưa gán chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id.toString()}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sắp xếp danh sách Manager"
              className="h-10 rounded-xl border border-gray-200 bg-slate-50/50 px-3 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="name-asc">Họ tên: A → Z</option>
              <option value="branch-asc">Chi nhánh: A → Z</option>
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Đặt lại
              </Button>
            )}
          </div>
        </div>

        {/* Filter summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <div>
            Hiển thị <span className="font-bold text-gray-800">{filteredManagers.length}</span> / {initialManagers.length} tài khoản Manager
            {hasActiveFilters && <span className="text-teal-600 font-medium ml-1.5">(Đang áp dụng bộ lọc)</span>}
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm overflow-hidden">
        {filteredManagers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-slate-50 p-4 text-slate-400 mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Không tìm thấy tài khoản Manager</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn &ldquo;Tất cả chi nhánh&rdquo; để xem toàn bộ danh sách.
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 rounded-xl text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-[280px] font-semibold text-gray-600">Họ và tên</TableHead>
                  <TableHead className="font-semibold text-gray-600">Liên hệ (SĐT / Email)</TableHead>
                  <TableHead className="font-semibold text-gray-600">Chi nhánh phụ trách</TableHead>
                  <TableHead className="font-semibold text-gray-600">Vai trò</TableHead>
                  <TableHead className="font-semibold text-gray-600">Trạng thái</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold text-gray-600">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredManagers.map((manager) => {
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
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 py-4">
                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                          <span className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-medium">{manager.phone || 'Chưa cập nhật'}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500">{manager.email || 'Chưa cập nhật'}</span>
                          </span>
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
