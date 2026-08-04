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

    // ── 2. Lấy utility logs mới nhất ────────────────────────────────────────
    const { data: logs, error: logError } = await supabase
      .from('utility_logs')
      .select('*')
      .in('room_id', roomIds)
      .order('year',  { ascending: false })
      .order('month', { ascending: false })

    if (logError) throw logError

    // Group by room_id → chỉ giữ log mới nhất
    const latestLogsMap: Record<number, Record<string, unknown>> = {}
    for (const log of (logs ?? [])) {
      if (!latestLogsMap[log.room_id]) {
        latestLogsMap[log.room_id] = log
      }
    }

    // ── 3. Lấy giá branch_services theo từng chi nhánh (cache by branch_id) ─
    const branchPricingCache: Record<number, Awaited<ReturnType<typeof getBranchPricing>>> = {}

    const uniqueBranchIds = [...new Set(rooms.map(r => r.branch_id as number).filter(Boolean))]
    await Promise.all(
      uniqueBranchIds.map(async (bid) => {
        branchPricingCache[bid] = await getBranchPricing(supabase, bid)
      })
    )

    // ── 4. Build response ───────────────────────────────────────────────────
    const docs = rooms.map(room => {
      const latestLog    = latestLogsMap[room.id]
      const pricing      = branchPricingCache[room.branch_id] ?? null
      const vehicleCount = (room.vehicle_count as number | null) ?? 0
      const totalServiceCost = pricing
        ? calcTotalServiceCost(pricing, vehicleCount)
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
        // ★ Giá từ branch_services — fixedServiceCost đã tính per_unit * vehicleCount
        electricPrice:    pricing?.electricPrice ?? 3_500,
        waterPrice:       pricing?.waterPrice    ?? 30_000,
        fixedServiceCost: totalServiceCost,
        fixedServices:    pricing?.fixedServices ?? [],
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
