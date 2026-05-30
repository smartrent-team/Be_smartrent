import { verifyRole } from '@/lib/rbac'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const supabase = auth.supabase!

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Tenant không có quyền xem thông tin điện nước' }, { status: 403 })
    }

    // 1. Get rooms
    let roomQuery = supabase.from('rooms').select('id, room_code, floor, status, branch_id')
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

    // 2. Query latest utility log for each room
    const { data: logs, error: logError } = await supabase
      .from('utility_logs')
      .select('*')
      .in('room_id', roomIds)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (logError) throw logError

    // Group logs by room_id and pick the latest one
    const latestLogsMap: Record<number, any> = {}
    if (logs) {
      for (const log of logs) {
        if (!latestLogsMap[log.room_id]) {
          latestLogsMap[log.room_id] = log
        }
      }
    }

    // Merge room info and its latest utility log
    const docs = rooms.map(room => {
      const latestLog = latestLogsMap[room.id]
      return {
        roomId: room.id,
        roomName: `Phòng ${room.room_code}`,
        floor: room.floor,
        status: room.status,
        prevElectric: latestLog ? (latestLog.electric_new ?? 0) : 0,
        prevWater: latestLog ? (latestLog.water_new ?? 0) : 0,
        electricOld: latestLog ? (latestLog.electric_old ?? 0) : 0,
        waterOld: latestLog ? (latestLog.water_old ?? 0) : 0,
        lastMonth: latestLog ? latestLog.month : null,
        lastYear: latestLog ? latestLog.year : null,
        utilityLogId: latestLog ? latestLog.id : null,
      }
    })

    return NextResponse.json({
      success: true,
      docs,
    })

  } catch (error: unknown) {
    console.error('Error fetching latest utilities:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
