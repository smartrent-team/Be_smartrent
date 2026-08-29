'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Phone,
  Mail,
  Eye,
  Search,
  X,
  RotateCcw,
  Users,
  Building,
  DoorOpen,
  Calendar,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { CreateTenantDialog } from './CreateTenantDialog'
import { EditTenantDialog } from './EditTenantDialog'
import { DeleteTenantButton } from './DeleteTenantButton'
import { LockTenantButton } from './LockTenantButton'

export interface FormattedTenant {
  id: number
  userId: number
  roomId: number | null
  depositAmount: number
  name: string
  phone: string
  email: string
  room: string
  branch: string
  branchId?: number | null
  status: 'active' | 'locked'
  joinDate: string
  rawMoveInDate?: string | null
  rawMoveOutDate?: string | null
}

export interface BranchOption {
  id: number
  name: string
}

export interface RoomOption {
  id: number
  room_code: string
  base_price?: number | null
  status?: string
}

interface TenantListClientProps {
  initialTenants: FormattedTenant[]
  branches: BranchOption[]
  allRooms: RoomOption[]
  availableRooms: RoomOption[]
}

export default function TenantListClient({
  initialTenants,
  branches,
  allRooms,
  availableRooms,
}: TenantListClientProps) {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedBranch !== 'all' ||
    selectedStatus !== 'all' ||
    sortBy !== 'date-desc'

  const handleResetFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedBranch('all')
    setSelectedStatus('all')
    setSortBy('date-desc')
    setCurrentPage(1)
  }, [])

  // Filter & Sort Logic
  const filteredTenants = useMemo(() => {
    let list = [...initialTenants]

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((t) => {
        const nameMatch = t.name.toLowerCase().includes(q)
        const phoneMatch = t.phone.toLowerCase().includes(q)
        const emailMatch = t.email.toLowerCase().includes(q)
        const roomMatch = t.room.toLowerCase().includes(q)
        const branchMatch = t.branch.toLowerCase().includes(q)
        return nameMatch || phoneMatch || emailMatch || roomMatch || branchMatch
      })
    }

    // 2. Branch Filter
    if (selectedBranch !== 'all') {
      const bid = parseInt(selectedBranch, 10)
      list = list.filter((t) => t.branchId === bid || t.branch === branches.find(b => b.id === bid)?.name)
    }

    // 3. Status Filter
    if (selectedStatus !== 'all') {
      list = list.filter((t) => t.status === selectedStatus)
    }

    // 4. Sort
    list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'vi')
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'vi')
      if (sortBy === 'room-asc') return a.room.localeCompare(b.room, 'vi')
      if (sortBy === 'date-asc') {
        const da = a.rawMoveInDate ? new Date(a.rawMoveInDate).getTime() : 0
        const db = b.rawMoveInDate ? new Date(b.rawMoveInDate).getTime() : 0
        return da - db
      }
      // default: date-desc (mới nhất trước)
      const da = a.rawMoveInDate ? new Date(a.rawMoveInDate).getTime() : 0
      const db = b.rawMoveInDate ? new Date(b.rawMoveInDate).getTime() : 0
      return db - da
    })

    return list
  }, [initialTenants, searchQuery, selectedBranch, selectedStatus, sortBy, branches])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize))
  const paginatedTenants = useMemo(() => {
    const from = (currentPage - 1) * pageSize
    return filteredTenants.slice(from, from + pageSize)
  }, [filteredTenants, currentPage, pageSize])

  // Overview Counts
  const stats = useMemo(() => {
    const total = initialTenants.length
    const active = initialTenants.filter((t) => t.status === 'active').length
    const locked = initialTenants.filter((t) => t.status === 'locked').length
    const hasRoom = initialTenants.filter((t) => t.room && t.room !== 'Trống').length
    return { total, active, locked, hasRoom }
  }, [initialTenants])

  return (
    <div className="space-y-6">
      {/* ═══ Header Section ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Quản lý Khách thuê
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Quản lý danh sách cư dân, thông tin liên hệ và hợp đồng thuê phòng.
          </p>
        </div>

        <CreateTenantDialog rooms={availableRooms as { id: number; room_code: string; base_price: number }[]} />
      </div>

      {/* ═══ Quick Overview Stats ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng cư dân</p>
            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Đang ở</p>
            <p className="text-xl font-bold text-emerald-600">{stats.active}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bị khóa</p>
            <p className="text-xl font-bold text-rose-600">{stats.locked}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600 shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Đã gán phòng</p>
            <p className="text-xl font-bold text-teal-600">{stats.hasRoom}</p>
          </div>
        </div>
      </div>

      {/* ═══ Smart Filter Bar ═══ */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Tìm theo tên, SĐT, email, mã phòng, chi nhánh..."
              className="pl-9 pr-8 h-9.5 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Filter */}
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9.5 pl-8 pr-7 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-slate-800 transition-all cursor-pointer appearance-none"
              >
                <option value="all">🏢 Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id.toString()}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9.5 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-slate-800 transition-all cursor-pointer"
            >
              <option value="all">Trạng thái: Tất cả</option>
              <option value="active">🟢 Đang ở (Hoạt động)</option>
              <option value="locked">🔴 Đã khóa</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9.5 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-slate-800 transition-all cursor-pointer"
            >
              <option value="date-desc">Ngày vào: Mới nhất</option>
              <option value="date-asc">Ngày vào: Cũ nhất</option>
              <option value="name-asc">Họ tên: A → Z</option>
              <option value="name-desc">Họ tên: Z → A</option>
              <option value="room-asc">Mã phòng: A → Z</option>
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9.5 px-2.5 text-xs text-slate-500 hover:text-slate-900 rounded-xl gap-1"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Đặt lại
              </Button>
            )}
          </div>
        </div>

        {/* Filter Summary Results */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Tìm thấy <strong className="text-slate-900">{filteredTenants.length}</strong> khách thuê
            {hasActiveFilters && ` (lọc từ ${initialTenants.length})`}
          </span>
          {totalPages > 1 && (
            <span>
              Trang {currentPage} / {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* ═══ Data Table ═══ */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">Khách hàng</TableHead>
              <TableHead className="font-semibold text-slate-700">Liên hệ</TableHead>
              <TableHead className="font-semibold text-slate-700">Phòng</TableHead>
              <TableHead className="font-semibold text-slate-700">Chi nhánh</TableHead>
              <TableHead className="font-semibold text-slate-700">Ngày vào ở</TableHead>
              <TableHead className="font-semibold text-slate-700">Trạng thái</TableHead>
              <TableHead className="w-[140px] text-right font-semibold text-slate-700">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTenants.length > 0 ? (
              paginatedTenants.map((tenant) => (
                <TableRow key={tenant.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-slate-900">{tenant.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Phone className="h-3 w-3 text-slate-400" /> {tenant.phone}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="h-3 w-3 text-slate-400" /> {tenant.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.room && tenant.room !== 'Trống' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Phòng {tenant.room}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Chưa gán phòng</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-emerald-700 text-xs">
                      {tenant.branch}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {tenant.joinDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.status === 'active' ? (
                      <Badge className="bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200 border-0 font-medium">
                        Đang ở
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-0 font-medium">
                        Đã khóa
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className={
                          buttonVariants({ variant: 'ghost', size: 'icon' }) +
                          ' text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl h-8.5 w-8.5 flex items-center justify-center'
                        }
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <EditTenantDialog tenant={{ ...tenant, rawMoveInDate: tenant.rawMoveInDate || '', rawMoveOutDate: tenant.rawMoveOutDate || null }} rooms={allRooms as { id: number; room_code: string; base_price: number; status: string }[]} />
                      <LockTenantButton userId={tenant.userId} tenantName={tenant.name} />
                      <DeleteTenantButton id={tenant.id} userId={tenant.userId} name={tenant.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-40 text-slate-400 py-10">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="w-8 h-8 text-slate-300" />
                    <span className="text-sm font-semibold text-slate-600">
                      {hasActiveFilters ? 'Không tìm thấy khách thuê phù hợp với bộ lọc' : 'Chưa có khách thuê nào'}
                    </span>
                    {hasActiveFilters ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-1 text-xs rounded-xl"
                      >
                        Xóa tất cả bộ lọc
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Hãy thêm khách thuê mới hoặc liên kết họ vào phòng để bắt đầu quản lý.
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ═══ Pagination Controls ═══ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredTenants.length)} trong tổng số {filteredTenants.length}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 text-xs rounded-lg"
            >
              Trước
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (
                  p === 1 ||
                  p === totalPages ||
                  (p >= currentPage - 1 && p <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={p}
                      variant={currentPage === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(p)}
                      className={`h-8 w-8 p-0 text-xs rounded-lg ${
                        currentPage === p ? 'bg-indigo-600 text-white' : ''
                      }`}
                    >
                      {p}
                    </Button>
                  )
                }
                if (p === currentPage - 2 || p === currentPage + 2) {
                  return (
                    <span key={p} className="px-1 text-xs text-slate-400">
                      ...
                    </span>
                  )
                }
                return null
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 text-xs rounded-lg"
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
