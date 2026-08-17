import { NextResponse, type NextRequest } from 'next/server'
import { getCheckoutPaymentBlock, sendCheckoutPaymentReminder } from '@/lib/checkout-payment-guard'
import { verifyRole } from '@/lib/rbac'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền xác nhận yêu cầu trả phòng' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const supabase = auth.supabase!

    // 1. Lấy thông tin tenant + user + contract
    const { data: tenantRow, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, room_id, user_id')
      .eq('id', tenantId)
      .single()

    if (tenantErr || !tenantRow) {
      return NextResponse.json({ error: 'Không tìm thấy cư dân' }, { status: 404 })
    }

    // 2. Kiểm tra quyền Manager (chỉ được xác nhận cư dân thuộc chi nhánh của mình)
    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Tài khoản Manager chưa được gán chi nhánh' }, { status: 403 })
      }
      if (tenantRow.room_id) {
        const { data: roomRow } = await supabase
          .from('rooms')
          .select('branch_id')
          .eq('id', tenantRow.room_id)
          .single()
        if (roomRow?.branch_id !== auth.branchId) {
          return NextResponse.json({ error: 'Không có quyền xác nhận cư dân này' }, { status: 403 })
        }
      }
    }

    // 3. Tìm checkout_request đang ở trạng thái 'requested'
    const { data: checkoutReq, error: reqErr } = await supabase
      .from('checkout_requests')
      .select('id, contract_id, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'requested')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (reqErr) {
      console.error('[confirm-checkout] Lỗi tìm checkout_request:', reqErr)
      return NextResponse.json({ error: 'Lỗi hệ thống khi tra cứu yêu cầu trả phòng.' }, { status: 500 })
    }

    if (!checkoutReq) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu trả phòng đang chờ xác nhận.' }, { status: 404 })
    }

    if (tenantRow.room_id) {
      const paymentBlock = await getCheckoutPaymentBlock(supabase, tenantId, tenantRow.room_id)
      if (paymentBlock.isBlocked) {
        await sendCheckoutPaymentReminder(supabase, tenantId, tenantRow.room_id, paymentBlock)
        return NextResponse.json({
          error: 'Phòng chỉ còn cư dân này nhưng vẫn còn hóa đơn chưa thanh toán. Vui lòng yêu cầu cư dân thanh toán trước khi xác nhận trả phòng.',
          paymentBlocked: true,
          unpaidInvoiceCount: paymentBlock.unpaidInvoiceCount,
          unpaidInvoiceTotal: paymentBlock.unpaidInvoiceTotal,
          latestInvoiceCode: paymentBlock.latestInvoiceCode,
        }, { status: 409 })
      }
    }

    // 4. Cập nhật checkout_request thành 'confirmed'
    const { error: updateReqErr } = await supabase
      .from('checkout_requests')
      .update({ status: 'confirmed', inspected_at: new Date().toISOString() })
      .eq('id', checkoutReq.id)

    if (updateReqErr) {
      console.error('[confirm-checkout] Lỗi cập nhật checkout_request:', updateReqErr)
      return NextResponse.json({ error: 'Không thể xác nhận yêu cầu trả phòng.' }, { status: 500 })
    }

    // 5. Lấy ngày hết hạn hợp đồng để tính số ngày còn lại
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, end_date, deposit_amount')
      .eq('id', checkoutReq.contract_id)
      .single()

    let remainingDays: number | null = null
    if (contract?.end_date) {
      const endDate = new Date(contract.end_date)
      const now = new Date()
      const diffMs = endDate.getTime() - now.getTime()
      remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    }

    // 6. Gửi thông báo cho cư dân
    try {
      const { dispatchNotification } = await import('@/lib/notification_dispatch')

      if (tenantRow.user_id) {
        await dispatchNotification(
          supabase,
          { userId: String(tenantRow.user_id) },
            {
              title: 'Yêu cầu trả phòng đã được xác nhận',
            body: 'Quản lý đã xác nhận yêu cầu trả phòng của bạn. Hệ thống sẽ xử lý trả phòng khi hợp đồng hết hạn.',
              type: 'contract',
              relatedId: String(tenantId),
            }
        )
      }
    } catch (notifErr) {
      console.error('[confirm-checkout] Lỗi gửi thông báo:', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xác nhận yêu cầu trả phòng thành công.',
      data: {
        checkoutRequestId: checkoutReq.id,
        remainingDays,
        contractEndDate: contract?.end_date ?? null,
        depositAmount: contract?.deposit_amount ?? 0,
      },
    })
  } catch (error: unknown) {
    console.error('[confirm-checkout] Lỗi không xác định:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ', details: msg }, { status: 500 })
  }
}
