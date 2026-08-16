import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(req: Request) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Không có quyền thực hiện' }, { status: 403 })
    }

    const supabase = auth.supabase!
    const body = await req.json()
    const { checkoutRequestId, adminNotes } = body

    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'Thiếu thông tin checkoutRequestId' }, { status: 400 })
    }

    // 1. Lấy thông tin checkout_request và contract liên quan
    const { data: request, error: reqError } = await supabase
      .from('checkout_requests')
      .select('*, contracts(id, deposit_amount)')
      .eq('id', checkoutRequestId)
      .single()

    if (reqError || !request) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu trả phòng' }, { status: 404 })
    }

    if (request.status !== 'inspecting') {
      return NextResponse.json({ error: 'Yêu cầu trả phòng không ở trạng thái chờ quyết toán' }, { status: 400 })
    }

    const contractId = request.contract_id
    const tenantId = request.tenant_id
    const roomId = request.room_id
    const isEarly = request.is_early
    // Note: contracts return array if 1-to-many, but here it's foreign key so it might be single object. 
    // Type casting helps avoid TS errors.
    const contract = request.contracts as any
    const depositAmount = contract?.deposit_amount || 0

    // 2. Tính tổng công nợ từ invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('room_price, service_cost, electric_cost, water_cost')
      .eq('tenant_id', tenantId)
      .in('payment_status', ['unpaid', 'partial']) // Nếu có partial, logic tính toán có thể phức tạp hơn, ở đây giả sử tính tổng unpaid

    let unpaidRent = 0
    let unpaidService = 0
    let unpaidElectric = 0
    let unpaidWater = 0
    
    if (invoices) {
        for (const inv of invoices) {
            unpaidRent += (inv.room_price || 0)
            unpaidService += (inv.service_cost || 0)
            unpaidElectric += (inv.electric_cost || 0)
            unpaidWater += (inv.water_cost || 0)
        }
    }

    // 3. Tính chi phí hư hỏng từ maintenance_tickets (checkout_damage)
    const { data: tickets } = await supabase
      .from('maintenance_tickets')
      .select('repair_cost')
      .eq('tenant_id', tenantId)
      .eq('issue_type', 'checkout_damage')
      .eq('approval_status', 'approved')

    let damageCost = 0
    if (tickets) {
        for (const ticket of tickets) {
            damageCost += (ticket.repair_cost || 0)
        }
    }

    const depositForfeited = isEarly ? depositAmount : 0

    // 4. Tạo record settlement
    const { data: settlement, error: settleError } = await supabase
      .from('checkout_settlements')
      .insert({
        checkout_request_id: checkoutRequestId,
        tenant_id: tenantId,
        room_id: roomId,
        unpaid_rent: unpaidRent,
        unpaid_electric: unpaidElectric,
        unpaid_water: unpaidWater,
        unpaid_service: unpaidService,
        damage_cost: damageCost,
        other_fees: 0,
        deposit_amount: depositAmount,
        deposit_forfeited: depositForfeited,
        status: 'pending_tenant_confirmation',
        admin_notes: adminNotes || '',
        created_by: auth.dbUserId
      })
      .select('*')
      .single()

    if (settleError) {
      console.error('[settlement] Lỗi tạo settlement:', settleError)
      return NextResponse.json({ error: 'Không thể lập quyết toán', details: settleError.message }, { status: 500 })
    }

    // 5. Cập nhật status các bảng
    await supabase.from('checkout_requests').update({ status: 'pending_tenant_confirmation', settled_at: new Date().toISOString() }).eq('id', checkoutRequestId)
    await supabase.from('contracts').update({ status: 'pending_settlement' }).eq('id', contractId)

    // 6. Gửi notification cho tenant
    try {
      const { dispatchNotification } = await import('@/lib/notification_dispatch')
      await dispatchNotification(
        supabase,
        { userId: auth.dbUserId }, // should be tenant's user_id, need to fetch it
        {
          title: 'Bảng quyết toán trả phòng',
          body: `Bảng quyết toán cuối cùng đã được lập. Vui lòng kiểm tra và xác nhận.`,
          type: 'checkout_settlement',
          relatedId: String(settlement.id),
        }
      )
    } catch (notifErr) {
      console.error('[settlement] Lỗi gửi thông báo:', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Đã lập bảng quyết toán thành công',
      data: settlement
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[settlement] Lỗi không xác định:', msg)
    return NextResponse.json(
      { error: 'Lỗi hệ thống. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}
