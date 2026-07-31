import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * PATCH /api/invoices/[id]/mark-paid
 * Dành cho manager / super_admin xác nhận thu tiền mặt → chuyển trạng thái hóa đơn sang "paid".
 * Body (optional): { note: string }
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (!['manager', 'super_admin'].includes(auth.role)) {
      return NextResponse.json({ error: 'Chỉ quản lý mới có quyền xác nhận thanh toán tiền mặt' }, { status: 403 })
    }

    const { id } = await context.params
    const invoiceId = Number(id)
    if (!Number.isFinite(invoiceId)) {
      return NextResponse.json({ error: 'ID hóa đơn không hợp lệ' }, { status: 400 })
    }

    // Parse body (optional note)
    let note = ''
    try {
      const body = await request.json()
      note = body?.note ?? ''
    } catch {
      // body không bắt buộc
    }

    const supabase = auth.supabase!

    // Lấy hóa đơn hiện tại
    const { data: invoice, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, invoice_code, payment_status, room_id')
      .eq('id', invoiceId)
      .maybeSingle()

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 })
    }

    if (invoice.payment_status === 'paid') {
      return NextResponse.json({ error: 'Hóa đơn đã được thanh toán trước đó' }, { status: 400 })
    }

    // Nếu là manager, chỉ được xác nhận hóa đơn thuộc chi nhánh mình quản lý
    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Người dùng chưa được gán vào cơ sở nào' }, { status: 403 })
      }
      const { data: room } = await supabase
        .from('rooms')
        .select('branch_id')
        .eq('id', invoice.room_id)
        .maybeSingle()
      if (!room || room.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không có quyền với hóa đơn này' }, { status: 403 })
      }
    }

    // Cập nhật payment_status → paid
    const updatePayload = {
      payment_status: 'paid',
    }

    const { data: updated, error: updateErr } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoiceId)
      .select('id, invoice_code, payment_status, total_amount')
      .maybeSingle()

    if (updateErr) {
      console.error('[mark-paid] update error:', updateErr)
      return NextResponse.json({ error: 'Không thể cập nhật hóa đơn', details: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Hóa đơn ${invoice.invoice_code} đã được xác nhận thanh toán tiền mặt.`,
      invoice: updated,
    })
  } catch (error: unknown) {
    console.error('[mark-paid] error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
