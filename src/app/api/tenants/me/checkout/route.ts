import { NextResponse } from 'next/server'
import { getLatestEffectiveContract } from '@/lib/contract-selection'
import { verifyRole } from '@/lib/rbac'

export async function POST() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!

    // 1. Lấy thông tin tenant hiện tại và hợp đồng
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        room_id,
        contracts ( id, status )
      `)
      .eq('user_id', auth.dbUserId)
      .is('move_out_date', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tenantError) {
      console.error('[checkout] Lỗi lấy thông tin tenant:', tenantError)
      return NextResponse.json({ error: 'Lỗi hệ thống khi tra cứu thông tin cư dân.' }, { status: 500 })
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ khách thuê đang hoạt động.' }, { status: 404 })
    }

    if (!tenant.room_id) {
      return NextResponse.json({ error: 'Bạn hiện chưa được gán phòng nào.' }, { status: 400 })
    }

    // 2. Tìm hợp đồng active
    const contracts = (tenant.contracts ?? []) as Array<{ id: number; status: string; start_date?: string | null; end_date?: string | null }>
    const activeContract = getLatestEffectiveContract(contracts)

    if (!activeContract) {
      // Kiểm tra xem đã có yêu cầu trả phòng chưa
      const alreadyPending = contracts.find(c => c.status === 'pending_checkout' || c.status === 'pending_liquidation')
      if (alreadyPending) {
        return NextResponse.json({ error: 'Bạn đã có yêu cầu trả phòng đang chờ xử lý.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng đang hoạt động.' }, { status: 400 })
    }

    // 3. Cập nhật trạng thái hợp đồng → pending_checkout
    const { error: contractUpdateError } = await supabase
      .from('contracts')
      .update({ status: 'pending_checkout' })
      .eq('id', activeContract.id)

    if (contractUpdateError) {
      console.error('[checkout] Lỗi cập nhật hợp đồng:', contractUpdateError)
      // Lỗi phổ biến: ENUM chưa có giá trị 'pending_checkout' → chưa chạy migration
      const isEnumError = contractUpdateError.message?.includes('invalid input value') ||
        contractUpdateError.message?.includes('enum') ||
        contractUpdateError.code === '22P02'
      if (isEnumError) {
        return NextResponse.json({
          error: 'Hệ thống chưa được cập nhật đầy đủ. Vui lòng liên hệ quản trị viên.',
        }, { status: 503 })
      }
      return NextResponse.json({ error: 'Không thể ghi nhận yêu cầu trả phòng. Vui lòng thử lại.' }, { status: 500 })
    }

    // 4. Tạo record checkout_request
    let isEarly = false;
    const { data: contractData } = await supabase.from('contracts').select('end_date').eq('id', activeContract.id).single();
    if (contractData && contractData.end_date) {
        isEarly = new Date() < new Date(contractData.end_date);
    }
    
    const { data: checkoutRequest, error: reqError } = await supabase
      .from('checkout_requests')
      .insert({
        contract_id: activeContract.id,
        tenant_id: tenant.id,
        room_id: tenant.room_id,
        is_early: isEarly,
        status: 'requested',
      })
      .select('id')
      .single()

    if (reqError) {
      console.error('[checkout] Lỗi tạo checkout_request:', reqError)
      // Không return error để không block flow, manager vẫn có thể inspection thông qua contract status
    }

    // 4. Nếu là người cuối trong phòng, chuyển phòng sang pending_checkout
    const { count } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', tenant.room_id)
      .eq('status', 'active')

    if (count === 0) {
      const { error: roomUpdateError } = await supabase
        .from('rooms')
        .update({ status: 'pending_checkout' })
        .eq('id', tenant.room_id)
      if (roomUpdateError) {
        // Không critical, chỉ log
        console.warn('[checkout] Không thể cập nhật trạng thái phòng:', roomUpdateError)
      }
    }

    // 5. Gửi thông báo cho Manager (không làm hỏng flow nếu lỗi)
    try {
      const { dispatchNotification } = await import('@/lib/notification_dispatch')

      const { data: userRec } = await supabase.from('users').select('full_name').eq('id', auth.dbUserId).single()
      const tenantUserName = userRec?.full_name || 'Cư dân'

      const { data: roomRec } = await supabase.from('rooms').select('room_code').eq('id', tenant.room_id).single()
      const roomCode = roomRec?.room_code ? `Phòng ${roomRec.room_code}` : `Phòng ID ${tenant.room_id}`

      const { data: managers } = await supabase.from('users').select('id').eq('role', 'manager')
      if (managers) {
        for (const mgr of managers) {
          await dispatchNotification(
            supabase,
            { userId: mgr.id },
            {
              title: 'Yêu cầu trả phòng mới',
              body: `${tenantUserName} (${roomCode}) vừa gửi yêu cầu trả phòng. Vui lòng xác nhận yêu cầu để hệ thống xử lý khi hợp đồng hết hạn.`,
              type: 'contract',
              relatedId: String(tenant.id),
            }
          )
        }
      }
    } catch (notifErr) {
      console.error('[checkout] Lỗi gửi thông báo:', notifErr)
    }

    return NextResponse.json({
      success: true,
      checkoutRequestId: checkoutRequest?.id,
      message: 'Yêu cầu trả phòng đã được ghi nhận. Quản lý sẽ xác nhận yêu cầu và hệ thống sẽ xử lý khi hợp đồng hết hạn.',
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[checkout] Lỗi không xác định:', msg)
    return NextResponse.json(
      { error: 'Lỗi hệ thống. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}
