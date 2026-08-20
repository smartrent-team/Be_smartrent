'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Eye,
  RefreshCw,
  Users,
  Search,
  X,
  Building,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface RoomTenant {
  id: number
  move_out_date: string | null
  user?: { full_name: string; status?: string | null } | null
}

export interface RoomRow {
  id: number
  room_code: string
  branch_id?: number | null
  branch?: { id?: number; name: string } | null
  floor: number | null
  base_price: number
  status: string
  tenants?: RoomTenant[]
}

export interface BranchOption {
  id: number
  name: string
}

// ─── Avatar stack + dropdown cho khách thuê ──────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w: string) => w[0].toUpperCase())
    .join('')
}

const AVATAR_COLORS = [
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

function TenantAvatarStack({ tenants }: { tenants: RoomTenant[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (tenants.length === 0) {
    return <span className="text-gray-400 italic text-xs">Trống</span>
  }

  const MAX_SHOW = 3
  const visible = tenants.slice(0, MAX_SHOW)
  const extra = tenants.length - MAX_SHOW

  return (
    <div ref={ref} className="relative inline-block">
      {/* Avatar stack */}
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center cursor-pointer group"
        title={tenants.length > 1 ? 'Xem tất cả khách thuê' : tenants[0].user?.full_name || ''}
      >
        <div className="flex -space-x-2">
          {visible.map((t, i) => {
            const name = t.user?.full_name || '?'
            return (
              <span
                key={t.id}
                className={`h-7 w-7 rounded-full border-2 border-white text-[10px] font-bold flex items-center justify-center shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
              >
                {getInitials(name)}
              </span>
            )
          })}
          {extra > 0 && (
            <span className="h-7 w-7 rounded-full border-2 border-white bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
              +{extra}
            </span>
          )}
        </div>
        {/* Tên nếu chỉ có 1 người */}
        {tenants.length === 1 && (
          <span className="ml-2 text-sm font-medium text-slate-700 group-hover:text-teal-700 transition-colors">
            {tenants[0].user?.full_name || 'Khách chưa đặt tên'}
          </span>
        )}
        {tenants.length > 1 && (
          <span className="ml-2 text-xs text-gray-500">{tenants.length} người</span>
        )}
      </button>

      {/* Dropdown danh sách */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Khách thuê ({tenants.length})</p>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {tenants.map((t, i) => {
              const name = t.user?.full_name || 'Khách chưa đặt tên'
              return (
                <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50">
                  <span className={`h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {getInitials(name)}
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface RoomListClientProps {
  initialRooms: RoomRow[]
  branches?: BranchOption[]
  initialStatus?: string
}

export default function RoomListClient({
  initialRooms,
  branches = [],
  initialStatus = 'all',
}: RoomListClientProps) {
  const [rooms, setRooms] = useState<RoomRow[]>(initialRooms)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [mounted, setMounted] = useState<boolean>(false)
  const router = useRouter()
  const supabase = createClient()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [selectedFloor, setSelectedFloor] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('code-asc')

  useEffect(() => {
    setRooms(initialRooms)
  }, [initialRooms])

  useEffect(() => {
    setMounted(true)
  }, [])

  const refresh = useCallback(() => {
    router.refresh()
    setLastUpdated(new Date())
  }, [router])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.info('Có phòng mới được thêm vào hệ thống')
          refresh()
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new
          setRooms(prev => prev.map(r =>
            r.id === updated.id
              ? { ...r, status: updated.status, base_price: updated.base_price, floor: updated.floor }
              : r
          ))
          setLastUpdated(new Date())
        } else if (payload.eventType === 'DELETE') {
          setRooms(prev => prev.filter(r => r.id !== payload.old.id))
          setLastUpdated(new Date())
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        // Khi tenant thay đổi (vào/ra phòng) → reload để cập nhật cột Khách thuê
        refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, refresh])

  // Extract distinct floors from rooms
  const distinctFloors = useMemo(() => {
    const floors = new Set<number>()
    rooms.forEach(r => {
      if (r.floor !== null && r.floor !== undefined) {
        floors.add(r.floor)
      }
    })
    return Array.from(floors).sort((a, b) => a - b)
  }, [rooms])

  // Filtered & Sorted rooms
  const filteredRooms = useMemo(() => {
    let result = [...rooms]

    // 1. Text Search (Room code or Tenant name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(r => {
        const codeMatch = r.room_code.toLowerCase().includes(q)
        const branchMatch = r.branch?.name ? r.branch.name.toLowerCase().includes(q) : false
        const tenantMatch = r.tenants?.some(
          t => t.user?.full_name && t.user.full_name.toLowerCase().includes(q)
        ) ?? false
        return codeMatch || branchMatch || tenantMatch
      })
    }

    // 2. Branch filter
    if (selectedBranch !== 'all') {
      result = result.filter(r => {
        if (r.branch?.name) {
          return r.branch.name === selectedBranch || String(r.branch_id) === selectedBranch
        }
        return false
      })
    }

    // 3. Status filter
    if (statusFilter !== 'all') {
      result = result.filter(r => {
        const activeCount = r.tenants?.filter(
          t => !t.move_out_date && !['locked', 'blocked', 'deleted'].includes(t.user?.status ?? '')
        ).length ?? 0
        const effectiveStatus = r.status === 'pending_checkout' || r.status === 'cleaning'
          ? (activeCount > 0 ? 'occupied' : 'available')
          : r.status
        return effectiveStatus === statusFilter
      })
    }

    // 4. Floor filter
    if (selectedFloor !== 'all') {
      const floorNum = parseInt(selectedFloor, 10)
      result = result.filter(r => r.floor === floorNum)
    }

    // 5. Sorting
    if (sortBy === 'code-asc') {
      result.sort((a, b) => a.room_code.localeCompare(b.room_code, undefined, { numeric: true }))
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.base_price - b.base_price)
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.base_price - a.base_price)
    } else if (sortBy === 'tenants-desc') {
      result.sort((a, b) => {
        const aTenants = a.tenants?.length ?? 0
        const bTenants = b.tenants?.length ?? 0
        return bTenants - aTenants
      })
    }

    return result
  }, [rooms, searchQuery, selectedBranch, statusFilter, selectedFloor, sortBy])

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedBranch !== 'all' ||
    statusFilter !== 'all' ||
    selectedFloor !== 'all' ||
    sortBy !== 'code-asc'

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedBranch('all')
    setStatusFilter('all')
    setSelectedFloor('all')
    setSortBy('code-asc')
  }

  const getStatusBadge = (status: string, activeTenantCount: number) => {
    const effectiveStatus = status === 'pending_checkout' || status === 'cleaning'
      ? (activeTenantCount > 0 ? 'occupied' : 'available')
      : status
    switch (effectiveStatus) {
      case 'available':   return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Trống</Badge>
      case 'occupied':    return <Badge variant="default" className="bg-blue-600">Đã thuê</Badge>
      case 'maintenance': return <Badge variant="destructive">Bảo trì</Badge>
      default:            return <Badge variant="secondary">{effectiveStatus}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar & Advanced Filters ── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col gap-4">
        {/* Row 1: Search & Quick status tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm theo mã phòng (P101), tên khách thuê..."
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

          {/* Status Buttons */}
          <div className="flex items-center rounded-xl bg-slate-100/80 p-1 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('available')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                statusFilter === 'available'
                  ? 'bg-white text-green-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Trống
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('occupied')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                statusFilter === 'occupied'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Đã thuê
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('maintenance')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                statusFilter === 'maintenance'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Bảo trì
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Branch, Floor, Sort) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            aria-label="Lọc theo chi nhánh"
            className="h-9 rounded-xl border border-gray-200 bg-slate-50/50 px-3 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả chi nhánh</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>

          {/* Floor Filter */}
          {distinctFloors.length > 0 && (
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              aria-label="Lọc theo tầng"
              className="h-9 rounded-xl border border-gray-200 bg-slate-50/50 px-3 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả tầng</option>
              {distinctFloors.map(floor => (
                <option key={floor} value={floor.toString()}>Tầng {floor}</option>
              ))}
            </select>
          )}

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sắp xếp danh sách phòng"
            className="h-9 rounded-xl border border-gray-200 bg-slate-50/50 px-3 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="code-asc">Mã phòng: Thứ tự tăng dần</option>
            <option value="price-asc">Giá thuê: Thấp → Cao</option>
            <option value="price-desc">Giá thuê: Cao → Thấp</option>
            <option value="tenants-desc">Số người thuê: Đông nhất</option>
          </select>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Đặt lại
            </Button>
          )}
        </div>

        {/* Realtime and counter footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3 w-3" />
            <span suppressHydrationWarning>
              Cập nhật: {mounted ? lastUpdated.toLocaleTimeString('vi-VN') : ''}
            </span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" title="Đang kết nối realtime" />
          </div>
          <div>
            Hiển thị <span className="font-bold text-gray-800">{filteredRooms.length}</span> / {rooms.length} phòng
            {hasActiveFilters && <span className="text-teal-600 font-medium ml-1.5">(Đang lọc)</span>}
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm overflow-hidden">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-slate-50 p-4 text-slate-400 mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Không tìm thấy phòng phù hợp</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              Thử điều chỉnh từ khóa tìm kiếm hoặc chọn lại chi nhánh/trạng thái.
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
                  <TableHead className="w-[140px] font-semibold text-gray-600">Mã phòng</TableHead>
                  <TableHead className="font-semibold text-gray-600">Chi nhánh</TableHead>
                  <TableHead className="w-[80px] font-semibold text-gray-600">Tầng</TableHead>
                  <TableHead className="font-semibold text-gray-600">Giá thuê</TableHead>
                  <TableHead className="font-semibold text-gray-600">Số người thuê</TableHead>
                  <TableHead className="font-semibold text-gray-600">Trạng thái</TableHead>
                  <TableHead className="font-semibold text-gray-600">Khách thuê</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold text-gray-600">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => {
                  const activeTenants = room.tenants?.filter(
                    t => !t.move_out_date && !['locked', 'blocked', 'deleted'].includes(t.user?.status ?? '')
                  ) ?? []
                  return (
                    <TableRow key={room.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                      <TableCell className="font-bold text-gray-900 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-mono text-sm border border-teal-100">
                          {room.room_code}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-800 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{room.branch?.name || 'Chưa phân chi nhánh'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-gray-600">
                        {room.floor !== null ? `Tầng ${room.floor}` : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900 py-4">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.base_price)}
                      </TableCell>
                      <TableCell className="py-4">
                        {activeTenants.length > 0 ? (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-800 font-bold flex items-center gap-1 w-fit">
                            <Users className="h-3 w-3 text-slate-500" />
                            {activeTenants.length} người
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">0 người</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">{getStatusBadge(room.status, activeTenants.length)}</TableCell>
                      <TableCell className="py-4">
                        <TenantAvatarStack tenants={activeTenants} />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Link
                          href={`/rooms/${room.id}`}
                          className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 rounded-lg h-9 w-9 inline-flex items-center justify-center'}
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
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
