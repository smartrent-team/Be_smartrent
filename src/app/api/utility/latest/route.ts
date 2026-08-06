import { verifyRole } from '@/lib/rbac'
import { NextResponse, type NextRequest } from 'next/server'
import { getBranchPricing, calcTotalServiceCost } from '@/lib/service-pricing'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }
    const supabase = auth.supabase!

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Tenant không có quyền xem thông tin điện nước' }, { status: 403 })
    }

    // ── 1. Lấy danh sách phòng ──────────────────────────────────────────────
    let roomQuery = supabase
      .from('rooms')
      .select('id, room_code, floor, status, branch_id, vehicle_count')

    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Manager chưa được gán chi nhánh' }, { status: 403 })
      }
      roomQuery = roomQuery.eq('branch_id', auth.branchId)
    }

    const { data: rooms, error: roomError } = await roomQuery
    if (roomError) throw roomError

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ success: true, docs: [] })
    }

    const roomIds = rooms.map(r => r.id)
    const uniqueBranchIds = [...new Set(rooms.map(r => r.branch_id as number).filter(Boolean))]

    // ── 2 + 3 + 3b. Chạy song song: logs, branch pricing, tenant counts ───────
    const [logsResult, activeTenants, ...pricingResults] = await Promise.all([
      supabase
        .from('utility_logs')
        .select('*')
        .in('room_id', roomIds)
        .order('year',  { ascending: false })
        .order('month', { ascending: false }),
      supabase
        .from('tenants')
        .select('room_id')
        .in('room_id', roomIds)
        .is('move_out_date', null),
      ...uniqueBranchIds.map(bid => getBranchPricing(supabase, bid)),
    ] as const)

    if (logsResult.error) throw logsResult.error

    // Group logs by room_id → chỉ giữ log mới nhất
    const latestLogsMap: Record<number, Record<string, unknown>> = {}
    for (const log of (logsResult.data ?? [])) {
      if (!latestLogsMap[log.room_id]) {
        latestLogsMap[log.room_id] = log
      }
    }

    // Build pricing cache từ kết quả song song
    const branchPricingCache: Record<number, Awaited<ReturnType<typeof getBranchPricing>>> = {}
    uniqueBranchIds.forEach((bid, i) => {
      branchPricingCache[bid] = pricingResults[i] as Awaited<ReturnType<typeof getBranchPricing>>
    })

    // Build tenant count map
    const tenantCountByRoom: Record<number, number> = {}
    for (const t of ((activeTenants as { data: Array<{ room_id: number }> | null }).data ?? [])) {
      tenantCountByRoom[t.room_id] = (tenantCountByRoom[t.room_id] ?? 0) + 1
    }

    // ── 4. Build response ───────────────────────────────────────────────────
    const docs = rooms.map(room => {
      const latestLog    = latestLogsMap[room.id]
      const pricing      = branchPricingCache[room.branch_id] ?? null
      const vehicleCount = (room.vehicle_count as number | null) ?? 0
      const tenantCount  = tenantCountByRoom[room.id] ?? 1
      const totalServiceCost = pricing
        ? calcTotalServiceCost(pricing, vehicleCount, tenantCount)
        : 0

      return {
        roomId:      room.id,
        roomName:    `Phòng ${room.room_code}`,
        floor:       room.floor,
        status:      room.status,
        vehicleCount,
        // Chỉ số kỳ trước
        prevElectric: latestLog ? (latestLog.electric_new as number ?? 0) : 0,
        prevWater:    latestLog ? (latestLog.water_new    as number ?? 0) : 0,
        electricOld:  latestLog ? (latestLog.electric_old as number ?? 0) : 0,
        waterOld:     latestLog ? (latestLog.water_old    as number ?? 0) : 0,
        lastMonth:    latestLog ? latestLog.month  : null,
        lastYear:     latestLog ? latestLog.year   : null,
        utilityLogId: latestLog ? latestLog.id     : null,
        // ★ Giá từ branch_services — fixedServiceCost đã tính per_unit * vehicleCount + per_person * tenantCount
        electricPrice:    pricing?.electricPrice ?? 3_500,
        waterPrice:       pricing?.waterPrice    ?? 30_000,
        fixedServiceCost: totalServiceCost,
        fixedServices:    pricing?.fixedServices ?? [],
        tenantCount,
      }
    })

    return NextResponse.json({ success: true, docs })

  } catch (error: unknown) {
    console.error('Error fetching latest utilities:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
