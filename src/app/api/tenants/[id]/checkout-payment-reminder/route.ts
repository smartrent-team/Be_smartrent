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
      return NextResponse.json({ error: 'Không có quyền gửi nhắc thanh toán trả phòng' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const supabase = auth.supabase!
    const { data: tenantRow, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, room_id')
      .eq('id', tenantId)
      .single()

    if (tenantErr || !tenantRow) {
      return NextResponse.json({ error: 'Không tìm thấy cư dân' }, { status: 404 })
    }

    if (!tenantRow.room_id) {
      return NextResponse.json({ error: 'Cư dân chưa được gán phòng' }, { status: 400 })
    }

    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Tài khoản Manager chưa được gán chi nhánh' }, { status: 403 })
      }

      const { data: roomRow } = await supabase
        .from('rooms')
        .select('branch_id')
        .eq('id', tenantRow.room_id)
        .single()

      if (roomRow?.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Không có quyền thao tác với cư dân này' }, { status: 403 })
      }
    }

    const paymentBlock = await getCheckoutPaymentBlock(supabase, tenantId, tenantRow.room_id)
    if (!paymentBlock.isBlocked) {
      return NextResponse.json({
        success: true,
        sent: false,
        paymentBlocked: false,
        message: 'Không còn hóa đơn chưa thanh toán cần nhắc. Có thể xác nhận trả phòng.',
      })
    }

    await sendCheckoutPaymentReminder(supabase, tenantId, tenantRow.room_id, paymentBlock, { force: true })

    return NextResponse.json({
      success: true,
      sent: true,
      paymentBlocked: true,
      unpaidInvoiceCount: paymentBlock.unpaidInvoiceCount,
      unpaidInvoiceTotal: paymentBlock.unpaidInvoiceTotal,
      latestInvoiceCode: paymentBlock.latestInvoiceCode,
      message: 'Đã gửi thông báo yêu cầu thanh toán hóa đơn.',
    })
  } catch (error: unknown) {
    console.error('[checkout-payment-reminder] Lỗi:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ', details: msg }, { status: 500 })
  }
}
