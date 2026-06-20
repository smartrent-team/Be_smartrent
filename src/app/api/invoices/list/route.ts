import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query params
    const statusParam = searchParams.get('status') // 'paid' | 'unpaid' | 'partial'
    const roomParam = searchParams.get('room_id')
    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = parseInt(searchParams.get('limit') || '20', 10)

    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20
    const offset = (page - 1) * limit

    // 1. Xác thực JWT qua RBAC
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }
    const supabase = auth.supabase!

    // 2. Build query
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_code,
        room_id,
        tenant_id,
        room_price,
        service_cost,
        electric_cost,
        water_cost,
        electric_old,
        electric_new,
        water_old,
        water_new,
        total_amount,
        payment_status,
        issued_at,
        created_at,
        payment_link_id,
        checkoutUrl,
        rooms (
          id,
          room_code,
          floor,
          branch_id
        )
      `, { count: 'exact' })

    // 3. Phân quyền theo Role
    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Tenant không có quyền xem danh sách hóa đơn tổng' }, { status: 403 })
    } else if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Người dùng chưa được gán vào cơ sở nào' }, { status: 403 })
      }
      // Lấy danh sách room_id thuộc chi nhánh của manager
      // (Supabase không hỗ trợ filter trực tiếp trên foreign table)
      const { data: branchRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id')
        .eq('branch_id', auth.branchId)

      if (roomsError) {
        return NextResponse.json({ error: 'Không thể lấy danh sách phòng theo chi nhánh' }, { status: 500 })
      }

      const branchRoomIds = (branchRooms || []).map((r: { id: number }) => r.id)

      if (branchRoomIds.length === 0) {
        // Chi nhánh chưa có phòng nào → trả về rỗng luôn
        return NextResponse.json({ success: true, docs: [], totalDocs: 0, limit, page, totalPages: 0 })
      }

      query = query.in('room_id', branchRoomIds)
    }
    // super_admin thấy tất cả

    // 4. Apply Filters
    if (statusParam) {
      query = query.eq('payment_status', statusParam)
    }
    if (roomParam) {
      query = query.eq('room_id', Number(roomParam))
    }

    // 5. Sắp xếp và phân trang
    query = query
      .order('issued_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: invoices, error, count } = await query

    if (error) {
      throw error
    }

    // 6. Transform response
    interface InvoiceRoom {
      id: number
      room_code: string
      floor: number
      branch_id: number
    }

    const docs = (invoices || []).map((inv: Record<string, unknown>) => {
      const room = inv.rooms as unknown as InvoiceRoom | null
      return {
        id: inv.id,
        invoiceCode: inv.invoice_code,
        roomId: inv.room_id,
        roomCode: room?.room_code || 'N/A',
        floor: room?.floor || 0,
        tenantId: inv.tenant_id,
        roomPrice: inv.room_price,
        serviceCost: inv.service_cost,
        electricCost: inv.electric_cost,
        waterCost: inv.water_cost,
        electricOld: inv.electric_old,
        electricNew: inv.electric_new,
        waterOld: inv.water_old,
        waterNew: inv.water_new,
        totalAmount: inv.total_amount,
        paymentStatus: inv.payment_status,
        issuedAt: inv.issued_at,
        createdAt: inv.created_at,
        checkoutUrl: inv.checkoutUrl,
      }
    })

    return NextResponse.json({
      success: true,
      docs,
      totalDocs: count || 0,
      limit,
      page,
      totalPages: count ? Math.ceil(count / limit) : 0,
    })

  } catch (error: unknown) {
    console.error('Error fetching invoices:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
