import type { SupabaseClient } from '@supabase/supabase-js'
import { redis } from '@/infrastructure/redis'

export interface ChainOverviewData {
  month: string;
  revenue: number;
  occupancyRate: number;
}

export interface BranchKPI {
  name: string;
  revenuePerSqm: number;
  occupancyRate: number;
  badDebt: number;
  utilityCost: number;
}

export interface RankedBranch {
  name: string;
  score: number;
  revenue: number;
  occupancyRate: number;
}

export interface ChainStats {
  totalRevenue: number;
  avgOccupancyRate: number;
  totalDebt: number;
  totalBranches: number;
}

export interface AnalyticsData {
  chainStats: ChainStats;
  chainOverviewData: ChainOverviewData[];
  branchKPIs: BranchKPI[];
  best: RankedBranch[];
  worst: RankedBranch[];
}

export class DashboardService {
  /**
   * Tính toán và trả về toàn bộ số liệu thống kê cho Dashboard
   * Có tích hợp Redis Caching để giảm tải cho database
   */
  static async getChainAnalytics(params: {
    supabase: SupabaseClient;
    organizationId: number;
  }): Promise<AnalyticsData | null> {
    const { supabase, organizationId } = params;

    const now = new Date()
    const currentMonth = `${now.getFullYear()}_${now.getMonth() + 1}`
    const cacheKey = `dashboard_stats:${organizationId}:${currentMonth}`

    // 1. Kiểm tra Cache Redis
    try {
      const cachedData = await redis.get(cacheKey)
      if (cachedData) {
        const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
        return parsed as AnalyticsData;
      }
    } catch (err) {
      console.error('Redis cache error:', err)
    }

    // 2. Nếu không có cache, tính toán từ Supabase
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    // Fetch all data in parallel
    const [
      { data: branches },
      { data: rooms },
      { data: invoicesThisMonth },
      { data: unpaidInvoices },
    ] = await Promise.all([
      supabase.from('branches').select('id, name').order('name'),
      supabase.from('rooms').select('id, branch_id, status, area, base_price'),
      supabase
        .from('invoices')
        .select('room_id, total_amount, payment_status, electric_cost, water_cost')
        .gte('issued_at', monthStart)
        .lt('issued_at', monthEnd),
      supabase
        .from('invoices')
        .select('room_id, total_amount')
        .in('payment_status', ['unpaid', 'partial']),
    ])

    const branchList = branches || []
    const roomList = rooms || []
    const monthInvoices = invoicesThisMonth || []
    const debtInvoices = unpaidInvoices || []

    // Build roomId → branchId map
    const roomBranchMap = new Map<number, number>()
    const roomAreaMap = new Map<number, number>()
    for (const r of roomList) {
      if (r.branch_id) roomBranchMap.set(r.id, r.branch_id)
      roomAreaMap.set(r.id, r.area || 0)
    }

    // ─── Chain-wide stats ───────────────────────────────────────
    const totalRevenue = monthInvoices
      .filter((inv) => inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    const totalRooms = roomList.length
    const occupiedRooms = roomList.filter((r) => r.status === 'occupied').length
    const avgOccupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    const totalDebt = debtInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    const chainStats: ChainStats = {
      totalRevenue,
      avgOccupancyRate: avgOccupancy,
      totalDebt,
      totalBranches: branchList.length,
    }

    // ─── Per-branch KPIs ────────────────────────────────────────
    const branchKPIs: BranchKPI[] = branchList.map((branch) => {
      const branchRooms = roomList.filter((r) => r.branch_id === branch.id)
      const totalArea = branchRooms.reduce((sum, r) => sum + (r.area || 0), 0)
      const branchOccupied = branchRooms.filter((r) => r.status === 'occupied').length
      const branchOccupancy = branchRooms.length > 0
        ? Math.round((branchOccupied / branchRooms.length) * 100)
        : 0

      // Room IDs in this branch
      const branchRoomIds = new Set(branchRooms.map((r) => r.id))

      // Revenue for this branch (paid invoices this month)
      const branchRevenue = monthInvoices
        .filter((inv) => branchRoomIds.has(inv.room_id) && inv.payment_status === 'paid')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

      // Revenue per m²
      const revenuePerSqm = totalArea > 0 ? Math.round(branchRevenue / totalArea) : 0

      // Bad debt (unpaid/partial)
      const branchDebt = debtInvoices
        .filter((inv) => branchRoomIds.has(inv.room_id))
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

      // Utility costs this month
      const utilityCost = monthInvoices
        .filter((inv) => branchRoomIds.has(inv.room_id))
        .reduce((sum, inv) => sum + (inv.electric_cost || 0) + (inv.water_cost || 0), 0)

      return {
        name: branch.name,
        revenuePerSqm,
        occupancyRate: branchOccupancy,
        badDebt: branchDebt,
        utilityCost,
      }
    })

    // ─── Top 3 best / worst (composite score) ───────────────────
    // Composite = 50% revenue rank + 50% occupancy rank (normalized)
    const maxRevenue = Math.max(...branchKPIs.map(b => b.revenuePerSqm), 1)
    const maxOccupancy = Math.max(...branchKPIs.map(b => b.occupancyRate), 1)

    const scored: RankedBranch[] = branchKPIs.map((b) => ({
      name: b.name,
      score: Math.round(
        (b.revenuePerSqm / maxRevenue) * 50 + (b.occupancyRate / maxOccupancy) * 50
      ),
      revenue: monthInvoices
        .filter((inv) => {
          const roomId = inv.room_id
          const bid = roomBranchMap.get(roomId)
          return bid === branchList.find(br => br.name === b.name)?.id && inv.payment_status === 'paid'
        })
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
      occupancyRate: b.occupancyRate,
    }))

    const sortedByScore = [...scored].sort((a, b) => b.score - a.score)
    const best = sortedByScore.slice(0, 3)
    const worst = sortedByScore.length > 3
      ? [...sortedByScore].reverse().slice(0, 3)
      : []

    // ─── Chain overview chart (6 months) ────────────────────────
    const chainOverviewData: ChainOverviewData[] = []
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    // Lấy toàn bộ hoá đơn đã thanh toán trong 6 tháng qua bằng 1 query duy nhất
    const { data: sixMonthsInvoices } = await supabase
      .from('invoices')
      .select('total_amount, paid_at')
      .eq('payment_status', 'paid')
      .gte('paid_at', sixMonthsAgo)
      .lt('paid_at', currentMonthEnd)

    // Gom nhóm theo tháng
    const revenueByMonth = new Map<string, number>()
    for (const inv of (sixMonthsInvoices || [])) {
      if (!inv.paid_at) continue
      const d = new Date(inv.paid_at)
      const key = `${d.getFullYear()}_${d.getMonth()}`
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + (inv.total_amount || 0))
    }

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}_${date.getMonth()}`
      const rev = revenueByMonth.get(key) || 0

      chainOverviewData.push({
        month: date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
        revenue: rev,
        occupancyRate: avgOccupancy,
      })
    }
    // Override current month with actual occupancy
    if (chainOverviewData.length > 0) {
      chainOverviewData[chainOverviewData.length - 1].occupancyRate = avgOccupancy
    }

    const resultData: AnalyticsData = {
      chainStats,
      chainOverviewData,
      branchKPIs,
      best,
      worst
    }

    // 3. Lưu vào Cache (Hết hạn sau 12 tiếng)
    try {
      await redis.set(cacheKey, JSON.stringify(resultData), { ex: 43200 })
    } catch (err) {
      console.error('Redis set error:', err)
    }

    return resultData
  }
}
