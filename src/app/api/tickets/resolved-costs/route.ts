import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

/**
 * GET /api/tickets/resolved-costs?roomId=<id>
 *
 * Trả về danh sách maintenance_tickets có status=resolved, repair_cost > 0
 * và chưa được tính vào hóa đơn nào (invoice_id IS NULL).
 *
 * Dùng bởi InvoiceConfirmPage (Flutter) để preview chi phí sửa chữa
 * trước khi tạo hóa đơn tháng.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json({ error: 'Thiếu roomId' }, { status: 400 })
    }

    const supabase = auth.supabase!

    // Kiểm tra quyền manager: chỉ xem phòng thuộc chi nhánh của mình
    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Manager chưa được gán chi nhánh' }, { status: 403 })
      }
      const { data: roomCheck } = await supabase
        .from('rooms')
        .select('branch_id')
        .eq('id', Number(roomId))
        .maybeSingle()

      if (!roomCheck || roomCheck.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Phòng không thuộc chi nhánh bạn quản lý' }, { status: 403 })
      }
    }

    // Lấy cư dân đang ở trong phòng (chưa chuyển đi)
    const { data: activeTenants } = await supabase
      .from('tenants')
      .select('id, move_in_date')
      .eq('room_id', Number(roomId))
      .is('move_out_date', null)

    const activeTenantIds = (activeTenants ?? []).map((t) => t.id)
    const validMoveInDates = (activeTenants ?? [])
      .map((t) => t.move_in_date)
      .filter((d): d is string => Boolean(d))
    const earliestMoveInDate = validMoveInDates.length > 0
      ? validMoveInDates.reduce((min, d) => (d < min ? d : min))
      : null

    const { data: tickets, error } = await supabase
      .from('maintenance_tickets')
      .select('id, title, repair_cost, created_at, status, tenant_id')
      .eq('room_id', Number(roomId))
      .eq('status', 'resolved')
      .not('repair_cost', 'is', null)
      .gt('repair_cost', 0)
      .is('invoice_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Lọc ticket: chỉ lấy ticket thuộc lượt thuê hiện tại
    const validTickets = (tickets ?? []).filter((t) => {
      if (t.tenant_id != null) {
        return activeTenantIds.includes(t.tenant_id)
      }
      if (earliestMoveInDate != null && t.created_at) {
        const ticketTime = new Date(t.created_at).getTime()
        const moveInTime = new Date(earliestMoveInDate).getTime()
        if (!isNaN(ticketTime) && !isNaN(moveInTime)) {
          return ticketTime >= moveInTime
        }
      }
      return false
    })

    const docs = validTickets.map((t) => ({
      id:         t.id,
      title:      t.title,
      repairCost: t.repair_cost,
      createdAt:  t.created_at,
    }))

    const totalRepairCost = docs.reduce((sum, t) => sum + (t.repairCost || 0), 0)

    return NextResponse.json({
      success: true,
      docs,
      totalRepairCost,
    })

  } catch (error: unknown) {
    console.error('Error fetching resolved-costs:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
