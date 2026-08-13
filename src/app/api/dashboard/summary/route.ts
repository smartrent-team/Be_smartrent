import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { formatVietnamDateDisplay } from '@/lib/date-utils'

/**
 * GET /api/dashboard/summary
 *
 * Gộp 5 query dashboard thành 1 request duy nhất:
 * rooms, tenants, invoices, tickets, utility logs
 *
 * Giảm số lượng HTTP request qua ngrok/tunnel từ 5 → 1.
 */
export async function GET() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json(
        { error: auth.error || 'Chưa xác thực' },
        { status: auth.status || 401 }
      )
    }

    if (auth.role === 'tenant') {
      return NextResponse.json(
        { error: 'Tenant không có quyền xem dashboard quản lý' },
        { status: 403 }
      )
    }

    const supabase = auth.supabase!
    const branchId = auth.branchId ?? null

    // ── Xây query rooms trước để lấy roomIds cho các query sau ──────────────
    let roomQuery = supabase
      .from('rooms')
      .select('id, room_code, floor, status, branch_id')
    if (auth.role === 'manager' && branchId) {
      roomQuery = roomQuery.eq('branch_id', branchId)
    }
    const { data: rooms, error: roomErr } = await roomQuery
    if (roomErr) throw roomErr

    const roomIds = (rooms || []).map((r) => r.id)
    const emptyRoomFilter = auth.role === 'manager' && roomIds.length === 0

    // ── Chạy 4 query còn lại song song ──────────────────────────────────────
    let tenantQuery = supabase
      .from('tenants')
      .select(`
        id,
        move_in_date,
        move_out_date,
        room:rooms!inner(room_code, branch_id),
        user:users!inner(id, full_name, phone, role)
      `)
      .is('move_out_date', null)
      .eq('user.status', 'active')
    if (auth.role === 'manager' && branchId) {
      tenantQuery = tenantQuery.eq('rooms.branch_id', branchId)
    }

    let invoiceQuery = supabase
      .from('invoices')
      .select(
        'id, room_id, total_amount, payment_status, issued_at, created_at, ' +
        'electric_old, electric_new, water_old, water_new'
      )
      .order('issued_at', { ascending: false })
      .limit(200)
    if (auth.role === 'manager') {
      invoiceQuery = emptyRoomFilter
        ? invoiceQuery.eq('room_id', -1)
        : invoiceQuery.in('room_id', roomIds)
    }

    let ticketQuery = supabase
      .from('maintenance_tickets')
      .select(
        'id, title, description, status, priority, images, created_at, repair_cost, ' +
        'rooms(id, room_code, floor), tenants(id, user:users(full_name, phone))'
      )
      .order('created_at', { ascending: false })
      .limit(50)
    if (auth.role === 'manager') {
      ticketQuery = emptyRoomFilter
        ? ticketQuery.eq('room_id', -1)
        : ticketQuery.in('room_id', roomIds)
    }

    const utilityPromise = roomIds.length > 0
      ? supabase
          .from('utility_logs')
          .select('room_id, month, year, electric_old, electric_new, water_old, water_new')
          .in('room_id', roomIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
      : Promise.resolve({ data: [], error: null })

    const [
      { data: tenantsRaw, error: tenantErr },
      { data: invoices,   error: invoiceErr },
      { data: tickets,    error: ticketErr },
      { data: logs,       error: logErr },
    ] = await Promise.all([tenantQuery, invoiceQuery, ticketQuery, utilityPromise])

    if (tenantErr) throw tenantErr
    if (invoiceErr) throw invoiceErr
    if (ticketErr) throw ticketErr
    if (logErr) throw logErr

    // ── Transform rooms ───────────────────────────────────────────────────
    const roomDocs = (rooms || []).map((r) => ({
      id: r.id,
      roomCode: r.room_code,
      floor: r.floor,
      status: r.status,
      branch: r.branch_id,
    }))

    // ── Build utility docs ────────────────────────────────────────────────
    const latestMap: Record<number, (typeof logs)[0]> = {}
    for (const log of logs ?? []) {
      if (!latestMap[log.room_id]) latestMap[log.room_id] = log
    }
    const utilityDocs = (rooms || []).map((room) => {
      const log = latestMap[room.id]
      return {
        roomId:    room.id,
        roomName:  `Phòng ${room.room_code}`,
        lastMonth: log?.month ?? null,
        lastYear:  log?.year  ?? null,
      }
    })

    // ── Transform tenants ─────────────────────────────────────────────────
    interface TenantRaw {
      id: number
      move_in_date: string
      move_out_date: string | null
      user: { full_name: string | null; phone: string | null; role: string } | null
    }
    const tenantDocs = ((tenantsRaw || []) as unknown as TenantRaw[])
      .filter((t) => t.user !== null)
      .map((t) => {
        const fullName = t.user?.full_name || 'Không tên'
        const nameParts = fullName.trim().split(' ')
        const initial = nameParts[nameParts.length - 1]?.[0]?.toUpperCase() ?? 'C'
        return {
          id: t.id,
          name: fullName,
          phone: t.user?.phone || 'Chưa cập nhật',
          checkInDate: formatVietnamDateDisplay(t.move_in_date) ?? 'Chưa cập nhật',
          isRoomHead: t.user?.role === 'owner',
          initial,
        }
      })

    // ── Transform invoices ────────────────────────────────────────────────
    const invoiceDocs = ((invoices as any[]) || []).map((inv) => ({
      id: inv.id,
      roomId: inv.room_id,
      totalAmount: inv.total_amount,
      paymentStatus: inv.payment_status,
      issuedAt: inv.issued_at,
      createdAt: inv.created_at,
      electricOld: inv.electric_old,
      electricNew: inv.electric_new,
      waterOld: inv.water_old,
      waterNew: inv.water_new,
    }))

    return NextResponse.json({
      success: true,
      data: {
        rooms: {
          docs: roomDocs,
          totalDocs: roomDocs.length,
        },
        tenants: {
          docs: tenantDocs,
        },
        invoices: {
          docs: invoiceDocs,
        },
        tickets: {
          data: tickets ?? [],
        },
        utilities: {
          docs: utilityDocs,
        },
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[dashboard/summary]', msg)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: msg },
      { status: 500 }
    )
  }
}
