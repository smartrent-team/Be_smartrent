import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyRole(['super_admin', 'manager'])
    if (auth.error || !auth.user || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const ticketId = Number(params.id)
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'ID ticket không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const { action, final_cost } = body // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Hành động không hợp lệ (approve/reject)' }, { status: 400 })
    }

    const supabase = auth.supabase!

    // 1. Get current ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Không tìm thấy sự cố' }, { status: 404 })
    }

    if (ticket.issue_type !== 'checkout_damage') {
      return NextResponse.json({ error: 'Chỉ áp dụng cho sự cố khi trả phòng' }, { status: 400 })
    }

    // 2. Cập nhật trạng thái duyệt
    const updateData: any = {
      approval_status: action === 'approve' ? 'approved' : 'rejected',
      status: action === 'approve' ? 'resolved' : 'pending',
    }

    if (action === 'approve' && final_cost !== undefined) {
      updateData.repair_cost = final_cost
    }

    const { error: updateErr } = await supabase
      .from('maintenance_tickets')
      .update(updateData)
      .eq('id', ticketId)

    if (updateErr) {
      console.error('Lỗi khi duyệt sự cố:', updateErr)
      return NextResponse.json({ error: 'Không thể cập nhật trạng thái sự cố' }, { status: 500 })
    }

    // 3. Nếu được duyệt, gửi thông báo cho cư dân về khoản phí này
    if (action === 'approve') {
      try {
        const { dispatchNotification } = await import('@/lib/notification_dispatch')
        const { data: tenantRow } = await supabase.from('tenants').select('user_id').eq('id', ticket.tenant_id).single()
        
        if (tenantRow?.user_id) {
          await dispatchNotification(
            supabase,
            { userId: String(tenantRow.user_id) },
            {
              title: 'Cập nhật chi phí bồi thường trả phòng',
              body: `Ban quản lý đã duyệt khoản chi phí sửa chữa ${final_cost?.toLocaleString('vi-VN')}đ cho sự cố: ${ticket.title}. Khoản này sẽ được cấn trừ vào tiền cọc của bạn.`,
              type: 'system',
              relatedId: String(ticket.id),
            }
          )
        }
      } catch (notifErr) {
        console.error('Lỗi gửi thông báo duyệt chi phí:', notifErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Đã duyệt chi phí bồi thường' : 'Đã từ chối chi phí',
    })

  } catch (error: unknown) {
    console.error('Lỗi API approve maintenance ticket:', error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    )
  }
}
