import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { getBranchPricing } from '@/lib/service-pricing'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('id')

    if (!roomId) {
      return NextResponse.json({ error: 'Thiếu ID phòng (parameter id)' }, { status: 400 })
    }

    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!

    // ── 1. Truy vấn chi tiết phòng ──────────────────────────────────────────
    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        *,
        tenants (
          id,
          move_in_date,
          move_out_date,
          user:users (
            id,
            full_name,
            phone
          )
        ),
        invoices (
          id,
          total_amount,
          payment_status,
          issued_at
        ),
        maintenance_tickets (
          id,
          title,
          priority,
          status,
          created_at
        ),
        room_fixtures (
          id,
          name,
          quantity,
          status,
          description,
          created_at
        )
      `)
      .eq('id', Number(roomId))
      .single()

    if (error || !room) {
      return NextResponse.json({ error: 'Không tìm thấy phòng được yêu cầu' }, { status: 404 })
    }

    // ── 2. Phân quyền ───────────────────────────────────────────────────────
    if (auth.role === 'manager') {
      if (!auth.branchId || room.branch_id !== auth.branchId) {
        return NextResponse.json(
          { error: 'Bạn không có quyền truy cập thông tin phòng thuộc chi nhánh khác' },
          { status: 403 }
        )
      }
    }

    interface RoomTenant {
      user?: { id: number; full_name: string; phone: string } | null
      move_out_date: string | null
      move_in_date:  string
      id: number
    }

    const roomTenants = room.tenants as unknown as RoomTenant[] | undefined

    if (auth.role === 'tenant') {
      const isMyRoom = roomTenants?.some(t => t.user?.id === auth.dbUserId && !t.move_out_date)
      if (!isMyRoom) {
        return NextResponse.json(
          { error: 'Bạn chỉ có quyền xem chi tiết phòng của chính mình' },
          { status: 403 }
        )
      }
    }

    // ── 3. Active tenants ───────────────────────────────────────────────────
    const activeTenants = roomTenants?.filter(t => !t.move_out_date) ?? []
    const tenantsListInfo = activeTenants.map(t => ({
      id:          t.id,
      name:        t.user?.full_name ?? 'Khách chưa có tên',
      phone:       t.user?.phone     ?? 'Chưa cập nhật',
      checkInDate: t.move_in_date,
      checkOutDate: t.move_out_date,
    }))
    const tenantInfo = tenantsListInfo.length > 0 ? tenantsListInfo[0] : null

    // ── 4. Invoices ─────────────────────────────────────────────────────────
    interface RoomInvoice {
      id: number
      total_amount: number
      payment_status: string
      issued_at: string
    }

    const invoicesList = ((room.invoices ?? []) as unknown as RoomInvoice[]).map(inv => ({
      id:            inv.id,
      totalAmount:   inv.total_amount,
      paymentStatus: inv.payment_status,
      issuedAt:      inv.issued_at,
    }))

    // ── 5. Tickets ──────────────────────────────────────────────────────────
    interface RoomTicket {
      id: number
      title: string
      status: string
      priority: string
      created_at: string
    }

    const ticketsList = ((room.maintenance_tickets ?? []) as unknown as RoomTicket[]).map(tick => ({
      id:        tick.id,
      title:     tick.title,
      priority:  tick.priority,
      status:    tick.status,
      createdAt: tick.created_at,
    }))

    // ── 6. Fixtures ─────────────────────────────────────────────────────────
    interface RoomFixture {
      id: number
      name: string
      quantity: number
      status: string
      description: string | null
      created_at: string
    }

    const fixturesList = ((room.room_fixtures ?? []) as unknown as RoomFixture[]).map(fix => ({
      id:          fix.id,
      name:        fix.name,
      quantity:    fix.quantity,
      status:      fix.status,
      description: fix.description,
      createdAt:   fix.created_at,
    }))

    // ── 7. ★ Giá dịch vụ từ branch_services (song song với các bước trên) ───
    const branchId: number | null = room.branch_id ?? null
    const pricing = branchId ? await getBranchPricing(supabase, branchId) : null

    // ── 8. Response ─────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        id:           room.id,
        roomCode:     room.room_code,
        floor:        room.floor,
        area:         room.area,
        basePrice:    room.base_price,
        // Giá điện/nước/dịch vụ từ branch_services (fallback về giá phòng hoặc default)
        electricPrice:    pricing?.electricPrice    ?? room.electric_price ?? 3_500,
        waterPrice:       pricing?.waterPrice       ?? room.water_price    ?? 30_000,
        fixedServiceCost: pricing?.fixedServiceCost ?? 0,
        fixedServices:    pricing?.fixedServices    ?? [],
        vehicleCount: room.vehicle_count ?? 0,
        status:   room.status,
        tenant:   tenantInfo,
        tenants:  tenantsListInfo,
        invoices: invoicesList,
        tickets:  ticketsList,
        fixtures: fixturesList,
      },
    })

  } catch (error: unknown) {
    console.error('Error fetching room detail:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
