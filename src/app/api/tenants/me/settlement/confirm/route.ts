import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(req: Request) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!
    const body = await req.json()
    const { settlementId, action, disputeReason } = body

    if (!settlementId || !['confirm', 'dispute'].includes(action)) {
      return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 })
    }

    // Lấy thông tin tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, user_id')
      .eq('user_id', auth.dbUserId)
      .is('move_out_date', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ cư dân' }, { status: 404 })
    }

    // Lấy thông tin settlement
    const { data: settlement } = await supabase
      .from('checkout_settlements')
      .select('*')
      .eq('id', settlementId)
      .eq('tenant_id', tenant.id)
      .single()

    if (!settlement) {
      return NextResponse.json({ error: 'Không tìm thấy bảng quyết toán' }, { status: 404 })
    }

    if (settlement.status !== 'pending_tenant_confirmation') {
      return NextResponse.json({ error: 'Bảng quyết toán không ở trạng thái chờ xác nhận' }, { status: 400 })
    }

    if (action === 'confirm') {
      // 1. Cập nhật settlement
      await supabase.from('checkout_settlements').update({ 
        status: 'completed', 
        tenant_confirmed_at: new Date().toISOString() 
      }).eq('id', settlementId)

      // 2. Cập nhật checkout_request
      await supabase.from('checkout_requests').update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }).eq('id', settlement.checkout_request_id)

      // 3. Cập nhật contract -> moved_out
      const { data: reqData } = await supabase.from('checkout_requests').select('contract_id').eq('id', settlement.checkout_request_id).single()
      if (reqData && reqData.contract_id) {
          await supabase.from('contracts').update({ status: 'moved_out' }).eq('id', reqData.contract_id)
      }

      // 4. Update move_out_date cho tenant
      await supabase.from('tenants').update({ move_out_date: new Date().toISOString() }).eq('id', tenant.id)
      
      // 5. Cập nhật phòng (nếu là người cuối)
      const { count } = await supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('room_id', settlement.room_id).in('status', ['active', 'pending_checkout', 'inspection', 'pending_settlement'])
      if (count === 0) {
          await supabase.from('rooms').update({ status: 'cleaning' }).eq('id', settlement.room_id)
      }

      return NextResponse.json({ success: true, message: 'Đã xác nhận quyết toán thành công.' })

    } else if (action === 'dispute') {
      if (!disputeReason) {
        return NextResponse.json({ error: 'Vui lòng nhập lý do khiếu nại' }, { status: 400 })
      }

      await supabase.from('checkout_settlements').update({ 
        status: 'disputed', 
        dispute_reason: disputeReason 
      }).eq('id', settlementId)

      await supabase.from('checkout_requests').update({ 
        status: 'disputed' 
      }).eq('id', settlement.checkout_request_id)

      // Gửi thông báo cho admin
      try {
        const { dispatchNotification } = await import('@/lib/notification_dispatch')
        const { data: superAdmins } = await supabase.from('users').select('id').eq('role', 'super_admin')
        if (superAdmins) {
          for (const sa of superAdmins) {
            await dispatchNotification(
              supabase,
              { userId: sa.id },
              {
                title: 'Cư dân khiếu nại quyết toán',
                body: `Cư dân đã khiếu nại bảng quyết toán với lý do: ${disputeReason}. Vui lòng kiểm tra.`,
                type: 'checkout_dispute',
                relatedId: String(settlementId),
              }
            )
          }
        }
      } catch (e) {
          console.error(e)
      }

      return NextResponse.json({ success: true, message: 'Đã gửi khiếu nại thành công. Ban quản lý sẽ liên hệ lại với bạn.' })
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[settlement confirm] Lỗi:', msg)
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 })
  }
}
