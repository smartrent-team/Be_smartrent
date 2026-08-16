import { NextRequest, NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

type Params = Promise<{ id: string }>

/**
 * PATCH /api/tenants/[id]/status
 * Cập nhật trạng thái cư dân nhanh (từ card danh sách):
 *   - action: 'block'           → Khóa tài khoản (users.status = 'locked')
 *   - action: 'end_contract'    → Hết hợp đồng (tenants.move_out_date = now, contracts.status = 'ended')
 */
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền thực hiện thao tác này' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const action = body.action as string // 'block' | 'end_contract'

    if (!['block', 'end_contract'].includes(action)) {
      return NextResponse.json(
        { error: 'Hành động không hợp lệ. Chỉ chấp nhận: block, end_contract' },
        { status: 400 }
      )
    }

    const supabase = auth.supabase!

    // Lấy thông tin tenant
    const { data: tenantRow, error: tenantError } = await supabase
      .from('tenants')
      .select('id, user_id, room_id, move_out_date')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenantRow) {
      return NextResponse.json({ error: 'Không tìm thấy cư dân' }, { status: 404 })
    }

    // Kiểm tra quyền manager: chỉ được quản lý cư dân thuộc chi nhánh mình
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
        if (roomRow?.branch_id && roomRow.branch_id !== auth.branchId) {
          return NextResponse.json({ error: 'Không có quyền cập nhật cư dân này' }, { status: 403 })
        }
      }
    }

    const now = new Date().toISOString()

    if (action === 'block') {
      // Khóa tài khoản user
      if (!tenantRow.user_id) {
        return NextResponse.json({ error: 'Cư dân chưa liên kết tài khoản' }, { status: 400 })
      }
      const { error: blockError } = await supabase
        .from('users')
        .update({ status: 'locked', updated_at: now })
        .eq('id', tenantRow.user_id)

      if (blockError) {
        return NextResponse.json(
          { error: 'Không thể khóa tài khoản', details: blockError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, message: 'Đã khóa tài khoản cư dân' })
    }

    if (action === 'end_contract') {
      // Đặt move_out_date cho tenant
      const { error: tenantUpdateError } = await supabase
        .from('tenants')
        .update({ move_out_date: now })
        .eq('id', tenantId)

      if (tenantUpdateError) {
        return NextResponse.json(
          { error: 'Không thể cập nhật trạng thái hợp đồng', details: tenantUpdateError.message },
          { status: 500 }
        )
      }

      // Kết thúc hợp đồng đang active
      await supabase
        .from('contracts')
        .update({ status: 'ended', end_date: now })
        .eq('tenant_id', tenantId)
        .eq('status', 'active')

      return NextResponse.json({ success: true, message: 'Đã kết thúc hợp đồng cư dân' })
    }

    return NextResponse.json({ error: 'Hành động không được xử lý' }, { status: 500 })

  } catch (error: unknown) {
    console.error('Error updating tenant status:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
