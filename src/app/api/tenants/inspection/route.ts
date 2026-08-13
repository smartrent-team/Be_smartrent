import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(request: Request) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền thực hiện báo cáo hư hỏng bàn giao' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { tenantId, roomId, damagedItems, estimatedRepairCost, notes } = body

    if (!roomId) {
      return NextResponse.json({ error: 'Phòng không được để trống' }, { status: 400 })
    }

    const supabase = auth.supabase!

    // Lấy mã phòng
    const { data: room } = await supabase.from('rooms').select('room_code').eq('id', roomId).single()
    const roomCode = room?.room_code ? `P.${room.room_code}` : `Phòng ID ${roomId}`

    const itemsList = Array.isArray(damagedItems) && damagedItems.length > 0
      ? damagedItems.join(', ')
      : 'Không có thiết bị hư hỏng'

    const costNum = Number(estimatedRepairCost) || 0

    // 1. Tạo ticket báo cáo hư hỏng bàn giao cho Super Admin duyệt
    const { data: ticket, error: ticketError } = await supabase
      .from('maintenance_tickets')
      .insert({
        room_id: Number(roomId),
        tenant_id: tenantId ? Number(tenantId) : undefined,
        title: `[Bàn Giao] Kiểm tra hư hỏng ${roomCode}`,
        description: `Danh sách thiết bị hỏng: ${itemsList}.\nGhi chú bàn giao: ${notes || 'Không có'}`,
        priority: 'high',
        status: 'pending',
        repair_cost: costNum,
        issue_type: 'checkout_damage',
        approval_status: 'pending',
        reported_by_id: auth.dbUserId,
      })
      .select('id')
      .single()

    if (ticketError) {
      console.error('Lỗi tạo ticket bảo trì:', ticketError)
      return NextResponse.json({ error: 'Không thể tạo báo cáo hư hỏng bàn giao', details: ticketError.message }, { status: 400 })
    }

    // 2. Nếu có tenantId, tìm hợp đồng đang active/pending_checkout của họ và chuyển sang pending_liquidation
    if (tenantId) {
      const { data: activeContract } = await supabase
        .from('contracts')
        .select('id')
        .eq('tenant_id', Number(tenantId))
        .in('status', ['active', 'pending_checkout', 'pending_liquidation'])
        .maybeSingle()

      if (activeContract) {
        await supabase
          .from('contracts')
          .update({ status: 'inspection' })
          .eq('id', activeContract.id)

        // Cập nhật checkout_request sang inspecting
        await supabase
          .from('checkout_requests')
          .update({ status: 'inspecting', inspected_at: new Date().toISOString() })
          .eq('contract_id', activeContract.id)
          .eq('status', 'requested')

        // 3. Kiểm tra xem phòng còn hợp đồng active/pending_checkout/inspection nào khác không
        const { count, error: countErr } = await supabase
          .from('contracts')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', Number(roomId))
          .in('status', ['active', 'pending_checkout', 'inspection'])
          .neq('id', activeContract.id)

        // Nếu không còn ai ở, chuyển phòng sang 'pending_checkout' thay vì 'cleaning' ngay lập tức
        if (!countErr && count === 0) {
          await supabase
            .from('rooms')
            .update({ status: 'pending_checkout' })
            .eq('id', Number(roomId))
        }
      }
    }

    // 4. Gửi notification cho Super Admin
    try {
      const { dispatchNotification } = await import('@/lib/notification_dispatch')
      const { data: superAdmins } = await supabase.from('users').select('id').eq('role', 'super_admin')
      if (superAdmins) {
        for (const sa of superAdmins) {
          await dispatchNotification(
            supabase,
            { userId: sa.id },
            {
              title: `Báo cáo bàn giao phòng ${roomCode}`,
              body: `Quản lý đã lập form bàn giao. Thiết bị hỏng: ${itemsList}. Chi phí sửa dự kiến: ${costNum.toLocaleString('vi-VN')}đ. Đang chờ duyệt.`,
              type: 'ticket',
              relatedId: String(ticket.id),
            }
          )
        }
      }
    } catch (notifErr) {
      console.warn('Lỗi gửi thông báo cho Super Admin:', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi báo cáo kiểm tra bàn giao phòng thành công',
      data: {
        ticketId: ticket.id,
        roomCode,
        estimatedRepairCost: costNum,
      },
    })
  } catch (error: unknown) {
    console.error('Lỗi tạo báo cáo kiểm tra phòng:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ', details: msg }, { status: 500 })
  }
}
