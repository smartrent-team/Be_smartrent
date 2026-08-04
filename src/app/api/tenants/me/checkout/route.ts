import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { leaveTenantRoom } from '@/lib/tenant-room-operations'

export async function POST() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!

    // Tìm hồ sơ tenant active của user đang đăng nhập
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, room_id, move_out_date')
      .eq('user_id', auth.dbUserId)
      .is('move_out_date', null)
      .maybeSingle()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin phòng ở của tài khoản này' }, { status: 404 })
    }

    const result = await leaveTenantRoom(
      supabase,
      tenant.id,
      { role: auth.role, branchId: auth.branchId ?? null },
      { isTenantSelf: true, reason: 'tenant_request' }
    )

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message: result.isEarly
        ? 'Bạn đã trả phòng thành công (Trả trước hạn: Tiền cọc đã được khấu trừ). Tài khoản đã được khóa.'
        : 'Trả phòng thành công. Tài khoản đã được hoàn tất và khóa.',
      data: {
        isEarly: result.isEarly,
        depositAmount: result.depositAmount,
        moveOutDate: result.moveOutDate,
        roomId: result.roomId,
      },
    })
  } catch (error: unknown) {
    console.error('Lỗi khi cư dân tự trả phòng:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ', details: msg }, { status: 500 })
  }
}
