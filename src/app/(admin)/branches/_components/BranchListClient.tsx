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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DeleteBranchButton } from './DeleteBranchButton'
import { EditBranchDialog } from './EditBranchDialog'
import {
  Search,
  X,
  UserCheck,
  UserX,
  MapPin,
  Phone,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react'

export interface BranchWithStats {
  id: number
  name: string
  address: string | null
  phone: string | null
  description: string | null
  created_at: string
  totalRooms: number
  occupiedRooms: number
  occupancyRate: number
  managers: Array<{
    id: string
    full_name: string | null
    phone: string | null
    branch_id: number | null
  }>
}

interface BranchListClientProps {
  initialBranches: BranchWithStats[]
}

export default function BranchListClient({ initialBranches }: BranchListClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [managerFilter, setManagerFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [occupancyFilter, setOccupancyFilter] = useState<'all' | 'available' | 'full' | 'empty'>('all')
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'rooms-desc' | 'occupancy-desc'>('default')

  const filteredBranches = useMemo(() => {
    let result = [...initialBranches]

    // 1. Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((b) => {
        const nameMatch = b.name.toLowerCase().includes(q)
        const addressMatch = b.address ? b.address.toLowerCase().includes(q) : false
        const phoneMatch = b.phone ? b.phone.toLowerCase().includes(q) : false
        const managerMatch = b.managers.some(
          (m) =>
            (m.full_name && m.full_name.toLowerCase().includes(q)) ||
            (m.phone && m.phone.toLowerCase().includes(q))
        )
        return nameMatch || addressMatch || phoneMatch || managerMatch
      })
    }

    // 2. Manager status filter
    if (managerFilter === 'assigned') {
      result = result.filter((b) => b.managers.length > 0)
    } else if (managerFilter === 'unassigned') {
      result = result.filter((b) => b.managers.length === 0)
    }

    // 3. Occupancy filter
    if (occupancyFilter === 'available') {
      // Có phòng trống (tỷ lệ < 100% và tổng phòng > 0)
      result = result.filter((b) => b.totalRooms > 0 && b.occupancyRate < 100)
    } else if (occupancyFilter === 'full') {
      // Đã đầy (100% và tổng phòng > 0)
      result = result.filter((b) => b.totalRooms > 0 && b.occupancyRate === 100)
    } else if (occupancyFilter === 'empty') {
      // Chưa có phòng nào được tạo (0 phòng)
      result = result.filter((b) => b.totalRooms === 0)
    }

    // 4. Sorting
    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    } else if (sortBy === 'rooms-desc') {
      result.sort((a, b) => b.totalRooms - a.totalRooms)
    } else if (sortBy === 'occupancy-desc') {
      result.sort((a, b) => b.occupancyRate - a.occupancyRate)
    }

    return result
  }, [initialBranches, searchQuery, managerFilter, occupancyFilter, sortBy])

  const hasActiveFilters = searchQuery !== '' || managerFilter !== 'all' || occupancyFilter !== 'all' || sortBy !== 'default'

  const handleResetFilters = () => {
    setSearchQuery('')
    setManagerFilter('all')
    setOccupancyFilter('all')
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
              placeholder="Tìm kiếm chi nhánh, địa chỉ, SĐT, Manager..."
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
            {/* Manager Filter */}
            <div className="flex items-center rounded-xl bg-slate-100/80 p-1 text-xs">
              <button
                type="button"
                onClick={() => setManagerFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  managerFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Tất cả QL
              </button>
              <button
                type="button"
                onClick={() => setManagerFilter('assigned')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  managerFilter === 'assigned'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Đã có QL
              </button>
              <button
                type="button"
                onClick={() => setManagerFilter('unassigned')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  managerFilter === 'unassigned'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <UserX className="h-3.5 w-3.5" />
                Chưa có QL
              </button>
            </div>

            {/* Occupancy Filter Dropdown */}
            <select
              value={occupancyFilter}
              onChange={(e) => setOccupancyFilter(e.target.value as any)}
              aria-label="Lọc theo tỷ lệ lấp đầy"
              className="h-10 rounded-xl border border-gray-200 bg-slate-50/50 px-3 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả tình trạng phòng</option>
              <option value="available">Còn phòng trống (&lt; 100%)</option>
              <option value="full">Đã đầy phòng (100%)</option>
              <option value="empty">Chưa có phòng (0 phòng)</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sắp xếp danh sách chi nhánh"
              className="h-10 rounded-xl border border-gray-200 bg-slate-50/50 px-3 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="name-asc">Tên: A → Z</option>
              <option value="rooms-desc">Số phòng: Nhiều nhất</option>
              <option value="occupancy-desc">Lấp đầy: Cao nhất</option>
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

        {/* Filter stats summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <div>
            Hiển thị <span className="font-bold text-gray-800">{filteredBranches.length}</span> / {initialBranches.length} chi nhánh
            {hasActiveFilters && <span className="text-teal-600 font-medium ml-1.5">(Đang áp dụng bộ lọc)</span>}
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm overflow-hidden">
        {filteredBranches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-slate-50 p-4 text-slate-400 mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Không tìm thấy chi nhánh phù hợp</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc bấm &ldquo;Đặt lại&rdquo; để hiển thị toàn bộ chi nhánh.
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
                  <TableHead className="w-[260px] font-semibold text-gray-600">Tên chi nhánh</TableHead>
                  <TableHead className="w-[300px] font-semibold text-gray-600">Địa chỉ & Liên hệ</TableHead>
                  <TableHead className="font-semibold text-gray-600">Manager phụ trách</TableHead>
                  <TableHead className="font-semibold text-gray-600">Số phòng</TableHead>
                  <TableHead className="font-semibold text-gray-600">Tỷ lệ lấp đầy</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold text-gray-600">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.map((branch) => (
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
                          {branch.managers.map((m) => (
                            <div key={m.id} className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-teal-600" />
                              <span className="text-sm font-semibold text-teal-800">{m.full_name || 'Manager'}</span>
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
                          <span className="text-gray-400 font-normal">
                            ({branch.occupiedRooms}/{branch.totalRooms})
                          </span>
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
