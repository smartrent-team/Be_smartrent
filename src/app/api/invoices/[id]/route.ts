import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }
    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { id } = await context.params
    const invoiceId = Number(id)
    if (!Number.isFinite(invoiceId)) {
      return NextResponse.json({ error: 'ID hóa đơn không hợp lệ' }, { status: 400 })
    }

    const supabase = auth.supabase!

    const { data: inv, error } = await supabase
      .from('invoices')
      .select(`
        id, invoice_code, total_amount, payment_status,
        issued_at, due_date, created_at, paid_at,
        room_price, service_cost, electric_cost, water_cost, repair_cost,
        electric_old, electric_new, water_old, water_new,
        qrPayload, checkoutUrl,
        payment_account_number, payment_account_name,
        payment_bank_bin, payment_description,
        rooms (
          id, room_code, floor, base_price,
          branch:branches ( id, name )
        ),
        tenants (
          id,
          user:users ( full_name, phone, email )
        )
      `)
      .eq('id', invoiceId)
      .maybeSingle()

    if (error || !inv) {
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 })
    }

    // Phân quyền manager: chỉ xem HĐ thuộc chi nhánh của mình
    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Manager chưa được gán chi nhánh' }, { status: 403 })
      }
      const room = Array.isArray(inv.rooms) ? inv.rooms[0] : inv.rooms
      const branch = room ? (Array.isArray(room.branch) ? room.branch[0] : room.branch) : null
      if (!branch || branch.id !== auth.branchId) {
        return NextResponse.json({ error: 'Không có quyền xem hóa đơn này' }, { status: 403 })
      }
    }

    // Lấy các ticket sửa chữa đã gắn với hóa đơn này
    const { data: tickets } = await supabase
      .from('maintenance_tickets')
      .select('id, title, repair_cost, status, created_at')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })

    // Transform
    const room   = Array.isArray(inv.rooms)   ? (inv.rooms as any[])[0]   : inv.rooms   as any
    const tenant = Array.isArray(inv.tenants) ? (inv.tenants as any[])[0] : inv.tenants as any
    const branch = room   ? (Array.isArray(room.branch)   ? room.branch[0]   : room.branch)   : null
    const user   = tenant ? (Array.isArray(tenant.user)   ? tenant.user[0]   : tenant.user)   : null

    return NextResponse.json({
      success: true,
      data: {
        id:            inv.id,
        invoiceCode:   inv.invoice_code,
        totalAmount:   inv.total_amount,
        paymentStatus: inv.payment_status,
        issuedAt:      inv.issued_at,
        dueDate:       inv.due_date,
        createdAt:     inv.created_at,
        paidAt:        (inv as any).paid_at ?? null,
        // Breakdown
        roomPrice:    inv.room_price    ?? 0,
        serviceCost:  inv.service_cost  ?? 0,
        electricCost: inv.electric_cost ?? 0,
        waterCost:    inv.water_cost    ?? 0,
        repairCost:   (inv as any).repair_cost ?? 0,
        electricOld:  inv.electric_old  ?? null,
        electricNew:  inv.electric_new  ?? null,
        waterOld:     inv.water_old     ?? null,
        waterNew:     inv.water_new     ?? null,
        // Payment
        qrPayload:              (inv as any).qrPayload ?? null,
        checkoutUrl:            (inv as any).checkoutUrl ?? null,
        paymentAccountNumber:   (inv as any).payment_account_number ?? null,
        paymentAccountName:     (inv as any).payment_account_name   ?? null,
        paymentBankBin:         (inv as any).payment_bank_bin       ?? null,
        paymentDescription:     (inv as any).payment_description    ?? null,
        // Room
        room: room ? {
          id:        room.id,
          roomCode:  room.room_code,
          floor:     room.floor,
          basePrice: room.base_price,
          branch:    branch ? { id: branch.id, name: branch.name } : null,
        } : null,
        // Tenant
        tenant: user ? {
          id:       tenant.id,
          fullName: user.full_name,
          phone:    user.phone,
          email:    user.email,
        } : null,
        // Repair tickets
        repairTickets: (tickets ?? []).map((t: any) => ({
          id:         t.id,
          title:      t.title,
          repairCost: t.repair_cost,
          status:     t.status,
          createdAt:  t.created_at,
        })),
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Lỗi máy chủ', details: msg }, { status: 500 })
  }
}
