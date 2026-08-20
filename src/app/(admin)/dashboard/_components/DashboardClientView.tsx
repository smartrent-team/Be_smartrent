'use client'

import { useState, useMemo } from 'react'
import {
  Building2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { DashboardKPIs, type KPIStats } from './DashboardKPIs'
import { RevenueTrendChart, type MonthTrendData } from './RevenueTrendChart'
import { RevenueDistributionChart, type RevenueBreakdown } from './RevenueDistributionChart'
import { RoomStatusDistribution, type RoomDistributionData } from './RoomStatusDistribution'
import { BranchBenchmark, type BranchBenchmarkItem } from './BranchBenchmark'
import { SmartAlertsCenter, type ExpiringContractItem, type UrgentTicketItem } from './SmartAlertsCenter'
import { RecentTransactions, type RecentTransactionItem } from './RecentTransactions'
import { TopRankedBranches, type RankedBranchItem } from './TopRankedBranches'

// ─── Raw Data Types from Server ──────────────────────────────────────
export interface RawBranch {
  id: number
  name: string
}

export interface RawRoom {
  id: number
  branch_id: number | null
  room_code: string
  status: string
  area: number | null
  base_price: number | null
  floor: number | null
}

export interface RawInvoice {
  id: number
  room_id: number
  total_amount: number
  payment_status: string
  issued_at: string | null
  paid_at: string | null
  due_date: string | null
  room_price: number | null
  electric_cost: number | null
  water_cost: number | null
  service_cost: number | null
  repair_cost: number | null
  invoice_code: string
}

export interface RawContract {
  id: number
  room_id: number | null
  tenant_id: number | null
  start_date: string | null
  end_date: string | null
  deposit_amount: number | null
  status: string
  tenants?: {
    user?: {
      full_name?: string
      phone?: string
    } | null
  } | null
}

export interface RawTicket {
  id: number
  room_id: number | null
  title: string
  priority: string
  status: string
  created_at: string
  rooms?: {
    room_code?: string
    branch_id?: number | null
  } | null
}

export interface RawTenant {
  id: number
  user_id: string | null
  room_id: number | null
  move_out_date: string | null
}

export interface DashboardClientViewProps {
  branches: RawBranch[]
  rooms: RawRoom[]
  invoices: RawInvoice[]
  contracts: RawContract[]
  tickets: RawTicket[]
  tenants: RawTenant[]
}

type TimeRangeKey = 'month' | '3months' | '6months' | 'year'

const TIME_RANGES: { key: TimeRangeKey; label: string }[] = [
  { key: 'month', label: 'Tháng này' },
  { key: '3months', label: '3 tháng' },
  { key: '6months', label: '6 tháng' },
  { key: 'year', label: 'Cả năm' },
]

export default function DashboardClientView({
  branches,
  rooms,
  invoices,
  contracts,
  tickets,
  tenants,
}: DashboardClientViewProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('month')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      window.location.reload()
    }, 300)
  }

  // ─── Fast Lookups ──────────────────────────────────────────────────
  const roomMap = useMemo(() => {
    const map = new Map<number, RawRoom>()
    for (const r of rooms) map.set(r.id, r)
    return map
  }, [rooms])

  const branchMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const b of branches) map.set(b.id, b.name)
    return map
  }, [branches])

  // Filtered rooms
  const currentRooms = useMemo(() => {
    if (selectedBranchId === 'all') return rooms
    const bid = parseInt(selectedBranchId, 10)
    return rooms.filter((r) => r.branch_id === bid)
  }, [rooms, selectedBranchId])

  const currentRoomIds = useMemo(() => {
    return new Set(currentRooms.map((r) => r.id))
  }, [currentRooms])

  // ─── Time Boundaries ────────────────────────────────────────────────
  const { currentStart, currentEnd, previousStart, previousEnd, monthCount } = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    let count = 1
    if (timeRange === '3months') count = 3
    else if (timeRange === '6months') count = 6
    else if (timeRange === 'year') count = 12

    const curStart = new Date(currentYear, currentMonth - count + 1, 1)
    const curEnd = new Date(currentYear, currentMonth + 1, 1)

    const prevStart = new Date(currentYear, currentMonth - count * 2 + 1, 1)
    const prevEnd = new Date(currentYear, currentMonth - count + 1, 1)

    return {
      currentStart: curStart,
      currentEnd: curEnd,
      previousStart: prevStart,
      previousEnd: prevEnd,
      monthCount: count,
    }
  }, [timeRange])

  // ─── Invoices in Current & Previous Period ───────────────────────────
  const { currentInvoices, previousInvoices } = useMemo(() => {
    const curInvs: RawInvoice[] = []
    const prevInvs: RawInvoice[] = []

    for (const inv of invoices) {
      if (!currentRoomIds.has(inv.room_id)) continue

      const refDateStr = inv.paid_at || inv.issued_at
      if (!refDateStr) continue
      const d = new Date(refDateStr)

      if (d >= currentStart && d < currentEnd) {
        curInvs.push(inv)
      } else if (d >= previousStart && d < previousEnd) {
        prevInvs.push(inv)
      }
    }

    return { currentInvoices: curInvs, previousInvoices: prevInvs }
  }, [invoices, currentRoomIds, currentStart, currentEnd, previousStart, previousEnd])

  // ─── 1. KPIs Calculation ─────────────────────────────────────────────
  const kpiStats: KPIStats = useMemo(() => {
    // Tenants & Contracts stats
    const activeTenants = (tenants || []).filter(
      (t) => t.room_id && currentRoomIds.has(t.room_id) && !t.move_out_date
    )
    const activeTenantsCount = activeTenants.length

    const activeContracts = (contracts || []).filter(
      (c) => c.status === 'active' && c.room_id && currentRoomIds.has(c.room_id)
    )
    const activeContractsCount = activeContracts.length

    // Room stats
    const totalRooms = currentRooms.length
    const occupiedRooms = currentRooms.filter((r) => r.status === 'occupied').length
    const availableRooms = currentRooms.filter((r) => r.status === 'available').length
    const maintenanceRooms = currentRooms.filter((r) => r.status === 'maintenance').length
    const cleaningRooms = currentRooms.filter((r) => r.status === 'cleaning').length
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

    // Debt stats (unpaid / partial across all time for selected scope)
    const unpaidInvs = invoices.filter(
      (inv) => currentRoomIds.has(inv.room_id) && ['unpaid', 'partial'].includes(inv.payment_status)
    )
    const totalDebt = unpaidInvs.reduce((s, inv) => s + (inv.total_amount || 0), 0)
    const unpaidInvoicesCount = unpaidInvs.length

    const now = new Date()
    const overdueInvoicesCount = unpaidInvs.filter((inv) => {
      if (!inv.due_date) return false
      return new Date(inv.due_date) < now
    }).length

    return {
      activeTenantsCount,
      activeContractsCount,
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      cleaningRooms,
      occupancyRate,
      totalDebt,
      unpaidInvoicesCount,
      overdueInvoicesCount,
    }
  }, [currentRooms, invoices, currentRoomIds, tenants, contracts])

  // ─── 2. Revenue Breakdown (Donut) ────────────────────────────────────
  const revenueBreakdown: RevenueBreakdown = useMemo(() => {
    const paidCur = currentInvoices.filter((inv) => inv.payment_status === 'paid')
    return {
      roomPrice: paidCur.reduce((s, inv) => s + (inv.room_price || 0), 0),
      electricCost: paidCur.reduce((s, inv) => s + (inv.electric_cost || 0), 0),
      waterCost: paidCur.reduce((s, inv) => s + (inv.water_cost || 0), 0),
      serviceCost: paidCur.reduce((s, inv) => s + (inv.service_cost || 0), 0),
      repairCost: paidCur.reduce((s, inv) => s + (inv.repair_cost || 0), 0),
    }
  }, [currentInvoices])

  // ─── 3. Monthly Trend Data (Area + Line) ──────────────────────────────
  const trendData: MonthTrendData[] = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const result: MonthTrendData[] = []

    for (let i = monthCount - 1; i >= 0; i--) {
      const monthStart = new Date(currentYear, currentMonth - i, 1)
      const monthEnd = new Date(currentYear, currentMonth - i + 1, 1)

      const monthInvs = invoices.filter((inv) => {
        if (!currentRoomIds.has(inv.room_id)) return false
        if (inv.payment_status !== 'paid') return false
        const d = inv.paid_at ? new Date(inv.paid_at) : inv.issued_at ? new Date(inv.issued_at) : null
        return d && d >= monthStart && d < monthEnd
      })

      const monthRevenue = monthInvs.reduce((s, inv) => s + (inv.total_amount || 0), 0)

      result.push({
        month: monthStart.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        occupancyRate: kpiStats.occupancyRate,
        paidInvoicesCount: monthInvs.length,
      })
    }

    return result
  }, [invoices, currentRoomIds, monthCount, kpiStats.occupancyRate])

  // ─── 4. Room Distribution Data ───────────────────────────────────────
  const roomDistributionData: RoomDistributionData = useMemo(() => {
    const floorMap = new Map<number, { total: number; occupied: number }>()

    for (const r of currentRooms) {
      const fl = r.floor || 1
      const cur = floorMap.get(fl) || { total: 0, occupied: 0 }
      cur.total += 1
      if (r.status === 'occupied') cur.occupied += 1
      floorMap.set(fl, cur)
    }

    const floors = Array.from(floorMap.entries())
      .map(([floor, stats]) => ({ floor, total: stats.total, occupied: stats.occupied }))
      .sort((a, b) => a.floor - b.floor)

    return {
      total: currentRooms.length,
      occupied: currentRooms.filter((r) => r.status === 'occupied').length,
      available: currentRooms.filter((r) => r.status === 'available').length,
      maintenance: currentRooms.filter((r) => r.status === 'maintenance').length,
      cleaning: currentRooms.filter((r) => r.status === 'cleaning').length,
      floors: floors.length > 1 ? floors : undefined,
    }
  }, [currentRooms])

  // ─── 5. Branch Benchmarks ───────────────────────────────────────────
  const branchBenchmarks: BranchBenchmarkItem[] = useMemo(() => {
    return branches.map((b) => {
      const bRooms = rooms.filter((r) => r.branch_id === b.id)
      const bRoomIds = new Set(bRooms.map((r) => r.id))
      const totalArea = bRooms.reduce((s, r) => s + (r.area || 0), 0)
      const occupiedRooms = bRooms.filter((r) => r.status === 'occupied').length
      const occupancyRate = bRooms.length > 0 ? (occupiedRooms / bRooms.length) * 100 : 0

      const bPaidInvs = invoices.filter(
        (inv) => bRoomIds.has(inv.room_id) && inv.payment_status === 'paid'
      )
      const revenue = bPaidInvs.reduce((s, inv) => s + (inv.total_amount || 0), 0)
      const revenuePerSqm = totalArea > 0 ? Math.round(revenue / totalArea) : 0

      const bDebtInvs = invoices.filter(
        (inv) => bRoomIds.has(inv.room_id) && ['unpaid', 'partial'].includes(inv.payment_status)
      )
      const badDebt = bDebtInvs.reduce((s, inv) => s + (inv.total_amount || 0), 0)

      const utilityCost = bPaidInvs.reduce(
        (s, inv) => s + (inv.electric_cost || 0) + (inv.water_cost || 0),
        0
      )

      return {
        id: b.id,
        name: b.name,
        revenue,
        occupancyRate,
        badDebt,
        utilityCost,
        totalRooms: bRooms.length,
        occupiedRooms,
      }
    })
  }, [branches, rooms, invoices])

  // ─── 6. Top Ranked Branches ─────────────────────────────────────────
  const { topBest, topWorst } = useMemo(() => {
    const maxRev = Math.max(...branchBenchmarks.map((b) => b.revenue), 1)
    const maxOcc = Math.max(...branchBenchmarks.map((b) => b.occupancyRate), 1)

    const scored: RankedBranchItem[] = branchBenchmarks.map((b) => {
      const score = Math.round(
        (b.revenue / maxRev) * 50 + (b.occupancyRate / maxOcc) * 50
      )
      return {
        id: b.id,
        name: b.name,
        score,
        revenue: b.revenue,
        occupancyRate: b.occupancyRate,
        totalRooms: b.totalRooms,
        occupiedRooms: b.occupiedRooms,
      }
    })

    const sorted = [...scored].sort((a, b) => b.score - a.score)
    const best = sorted.slice(0, 3)
    const worst = sorted.length > 3 ? [...sorted].reverse().slice(0, 3) : []

    return { topBest: best, topWorst: worst }
  }, [branchBenchmarks])

  // ─── 7. Smart Alerts (Expiring Contracts & Urgent Tickets) ─────────
  const expiringContracts: ExpiringContractItem[] = useMemo(() => {
    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    return contracts
      .filter((c) => {
        if (c.status !== 'active' || !c.end_date) return false
        if (c.room_id && !currentRoomIds.has(c.room_id)) return false
        const endD = new Date(c.end_date)
        return endD >= new Date(now.getTime() - 24 * 60 * 60 * 1000) && endD <= in30Days
      })
      .map((c) => {
        const r = c.room_id ? roomMap.get(c.room_id) : undefined
        const endD = new Date(c.end_date!)
        const diffDays = Math.ceil((endD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const tenantUser = c.tenants?.user

        return {
          id: c.id,
          roomCode: r ? `Phòng ${r.room_code}` : 'Chưa gán',
          branchName: r?.branch_id ? branchMap.get(r.branch_id) : undefined,
          tenantName: tenantUser?.full_name || 'Khách thuê',
          phone: tenantUser?.phone,
          endDate: c.end_date!,
          daysRemaining: diffDays,
        }
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
  }, [contracts, currentRoomIds, roomMap, branchMap])

  const urgentTickets: UrgentTicketItem[] = useMemo(() => {
    return tickets
      .filter((t) => {
        if (!['pending', 'in-progress'].includes(t.status)) return false
        if (t.room_id && !currentRoomIds.has(t.room_id)) return false
        return true
      })
      .map((t) => {
        const r = t.room_id ? roomMap.get(t.room_id) : undefined
        return {
          id: t.id,
          title: t.title,
          roomCode: r ? `Phòng ${r.room_code}` : 'Chung',
          branchName: r?.branch_id ? branchMap.get(r.branch_id) : undefined,
          priority: t.priority,
          createdAt: t.created_at,
        }
      })
      .sort((a, b) => {
        const pOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9)
      })
  }, [tickets, currentRoomIds, roomMap, branchMap])

  // ─── 8. Recent Transactions ─────────────────────────────────────────
  const recentTransactions: RecentTransactionItem[] = useMemo(() => {
    return invoices
      .filter((inv) => currentRoomIds.has(inv.room_id) && inv.payment_status === 'paid' && inv.paid_at)
      .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())
      .slice(0, 6)
      .map((inv) => {
        const r = roomMap.get(inv.room_id)
        return {
          id: inv.id,
          invoiceCode: inv.invoice_code,
          roomCode: r?.room_code || `${inv.room_id}`,
          branchName: r?.branch_id ? branchMap.get(r.branch_id) : undefined,
          tenantName: 'Cư dân',
          totalAmount: inv.total_amount,
          paidAt: inv.paid_at!,
        }
      })
  }, [invoices, currentRoomIds, roomMap, branchMap])

  return (
    <div className="space-y-6">
      {/* ═══ Header & Smart Filter Bar ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Bảng Điều Khiển
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Super Admin
            </span>
          </div>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Trung tâm giám sát tài chính, lấp đầy phòng và hiệu suất toàn chuỗi
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Select */}
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9.5 pl-9 pr-8 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none text-slate-800"
            >
              <option value="all">🏢 Toàn bộ chi nhánh ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id.toString()}>
                  📍 {b.name}
                </option>
              ))}
            </select>
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
            {TIME_RANGES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTimeRange(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  timeRange === t.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="Làm mới dữ liệu"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ 1. KPIs Section ═══ */}
      <DashboardKPIs stats={kpiStats} />

      {/* ═══ 2. Trạng thái & Phân bổ Phòng (Nằm trên biểu đồ doanh thu) ═══ */}
      <RoomStatusDistribution data={roomDistributionData} />

      {/* ═══ 3. Xu hướng Doanh thu & Cơ cấu Nguồn thu ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Revenue Trend (7 cols) */}
        <div className="lg:col-span-7">
          <RevenueTrendChart data={trendData} />
        </div>

        {/* Right: Revenue Breakdown Donut (5 cols) */}
        <div className="lg:col-span-5">
          <RevenueDistributionChart breakdown={revenueBreakdown} />
        </div>
      </div>

      {/* ═══ 4. So sánh Hiệu suất giữa các Tòa nhà ═══ */}
      <BranchBenchmark branches={branchBenchmarks} />

      {/* ═══ 4. Smart Alerts (Expiring Contracts & Urgent Tickets) ═══ */}
      <SmartAlertsCenter
        expiringContracts={expiringContracts}
        urgentTickets={urgentTickets}
      />

      {/* ═══ 5. Bottom Section: Top Branches & Recent Transactions ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Branches */}
        <TopRankedBranches best={topBest} />

        {/* Right: Recent Transactions */}
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </div>
  )
}
