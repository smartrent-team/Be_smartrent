import type { SupabaseClient } from '@supabase/supabase-js'

type AuthContext = {
  role: 'super_admin' | 'manager' | 'tenant'
  branchId: number | null
}

type TenantRow = {
  id: number
  room_id: number | null
  move_out_date: string | null
  user_id: number | null
}

async function loadTenant(
  supabase: SupabaseClient,
  tenantId: number
): Promise<{ tenant: TenantRow | null; error?: string; status?: number }> {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, room_id, move_out_date, user_id')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    if (error?.code === 'PGRST116') {
      return { tenant: null, error: 'Không tìm thấy cư dân', status: 404 }
    }
    return { tenant: null, error: 'Không thể tải hồ sơ cư dân', status: 400 }
  }

  return { tenant }
}

async function assertManagerAccessToTenant(
  supabase: SupabaseClient,
  auth: AuthContext,
  tenant: TenantRow
): Promise<{ error?: string; status?: number }> {
  if (auth.role === 'tenant') {
    return { error: 'Không có quyền thực hiện thao tác này', status: 403 }
  }

  if (auth.role === 'manager') {
    if (!auth.branchId) {
      return { error: 'Tài khoản Manager chưa được gán chi nhánh', status: 403 }
    }
    if (!tenant.room_id) {
      return { error: 'Cư dân chưa được gán phòng', status: 400 }
    }
    const { data: roomRow } = await supabase
      .from('rooms')
      .select('branch_id')
      .eq('id', tenant.room_id)
      .single()

    if (roomRow?.branch_id !== auth.branchId) {
      return { error: 'Không có quyền thao tác với cư dân này', status: 403 }
    }
  }

  return {}
}

async function assertManagerAccessToRoom(
  supabase: SupabaseClient,
  auth: AuthContext,
  roomId: number
): Promise<{ error?: string; status?: number }> {
  if (auth.role !== 'manager') return {}

  if (!auth.branchId) {
    return { error: 'Tài khoản Manager chưa được gán chi nhánh', status: 403 }
  }

  const { data: roomRow } = await supabase
    .from('rooms')
    .select('branch_id')
    .eq('id', roomId)
    .single()

  if (!roomRow) {
    return { error: 'Không tìm thấy phòng', status: 404 }
  }

  if (roomRow.branch_id !== auth.branchId) {
    return { error: 'Phòng không thuộc chi nhánh của bạn', status: 403 }
  }

  return {}
}

export async function changeTenantRoom(
  supabase: SupabaseClient,
  tenantId: number,
  newRoomId: number,
  auth: AuthContext
): Promise<{ success: true; oldRoomId: number | null; newRoomId: number } | { error: string; status: number }> {
  const { tenant, error: loadError, status: loadStatus } = await loadTenant(supabase, tenantId)
  if (!tenant) {
    return { error: loadError || 'Không tìm thấy cư dân', status: loadStatus || 404 }
  }

  const accessError = await assertManagerAccessToTenant(supabase, auth, tenant)
  if (accessError.error) {
    return { error: accessError.error, status: accessError.status || 403 }
  }

  if (tenant.move_out_date) {
    return { error: 'Cư dân đã trả phòng, không thể đổi phòng', status: 400 }
  }

  if (!tenant.room_id) {
    return { error: 'Cư dân chưa được gán phòng hiện tại', status: 400 }
  }

  const oldRoomId = tenant.room_id

  if (oldRoomId === newRoomId) {
    return { error: 'Phòng mới trùng với phòng hiện tại', status: 400 }
  }

  const roomAccessError = await assertManagerAccessToRoom(supabase, auth, newRoomId)
  if (roomAccessError.error) {
    return { error: roomAccessError.error, status: roomAccessError.status || 403 }
  }

  const { data: newRoom, error: newRoomError } = await supabase
    .from('rooms')
    .select('id, status, base_price, branch_id')
    .eq('id', newRoomId)
    .single()

  if (newRoomError || !newRoom) {
    return { error: 'Không tìm thấy phòng mới', status: 404 }
  }

  if (newRoom.status !== 'available') {
    return { error: 'Phòng mới không còn trống', status: 400 }
  }

  const { error: tenantUpdateError } = await supabase
    .from('tenants')
    .update({ room_id: newRoomId })
    .eq('id', tenantId)

  if (tenantUpdateError) {
    return { error: 'Không thể cập nhật phòng cho cư dân', status: 400 }
  }

  const { data: activeContract } = await supabase
    .from('contracts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeContract?.id) {
    await supabase
      .from('contracts')
      .update({
        room_id: newRoomId,
        monthly_price: newRoom.base_price || 0,
      })
      .eq('id', activeContract.id)
  }

  await supabase.from('rooms').update({ status: 'available' }).eq('id', oldRoomId)
  await supabase.from('rooms').update({ status: 'occupied' }).eq('id', newRoomId)

  return { success: true, oldRoomId, newRoomId }
}

export type LeaveRoomReason =
  | 'contract_expired'
  | 'tenant_request'
  | 'early_checkout'
  | 'other'

export async function leaveTenantRoom(
  supabase: SupabaseClient,
  tenantId: number,
  auth: AuthContext,
  options?: {
    moveOutDate?: string
    reason?: LeaveRoomReason
    isTenantSelf?: boolean
  }
): Promise<{ success: true; moveOutDate: string; roomId: number | null; isEarly: boolean; depositAmount: number } | { error: string; status: number }> {
  const { tenant, error: loadError, status: loadStatus } = await loadTenant(supabase, tenantId)
  if (!tenant) {
    return { error: loadError || 'Không tìm thấy cư dân', status: loadStatus || 404 }
  }

  // Nếu cư dân tự thực hiện trả phòng thì không cần assertManagerAccessToTenant
  if (!options?.isTenantSelf) {
    const accessError = await assertManagerAccessToTenant(supabase, auth, tenant)
    if (accessError.error) {
      return { error: accessError.error, status: accessError.status || 403 }
    }
  }

  if (tenant.move_out_date) {
    return { error: 'Cư dân đã trả phòng trước đó', status: 400 }
  }

  const moveOutIso = options?.moveOutDate
    ? new Date(options.moveOutDate).toISOString()
    : new Date().toISOString()

  // 1. Cập nhật ngày trả phòng cho tenant
  const { error: tenantUpdateError } = await supabase
    .from('tenants')
    .update({ move_out_date: moveOutIso })
    .eq('id', tenantId)

  if (tenantUpdateError) {
    return { error: 'Không thể cập nhật ngày trả phòng', status: 400 }
  }

  // 2. Lấy thông tin user và phòng
  let tenantUserName = 'Cư dân'
  if (tenant.user_id) {
    const { data: userRec } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', tenant.user_id)
      .single()
    if (userRec?.full_name) tenantUserName = userRec.full_name

    // Khóa tài khoản user cư dân
    await supabase
      .from('users')
      .update({ status: 'locked' })
      .eq('id', tenant.user_id)
  }

  let roomCode = 'P.' + (tenant.room_id || 'Chưa xác định')
  if (tenant.room_id) {
    const { data: roomRec } = await supabase
      .from('rooms')
      .select('room_code')
      .eq('id', tenant.room_id)
      .single()
    if (roomRec?.room_code) roomCode = `Phòng ${roomRec.room_code}`
  }

  // 3. Lấy hợp đồng active
  const { data: activeContract } = await supabase
    .from('contracts')
    .select('id, contract_text, end_date, deposit_amount')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  let isEarly = false
  let depositAmount = 0

  if (activeContract?.id) {
    depositAmount = activeContract.deposit_amount || 0
    if (activeContract.end_date) {
      const contractEndDate = new Date(activeContract.end_date)
      const now = new Date(moveOutIso)
      if (now < contractEndDate) {
        isEarly = true
      }
    }

    const reasonNote = isEarly
      ? `Trả phòng trước hạn (Tịch thu cọc: ${depositAmount.toLocaleString('vi-VN')} đ)`
      : (options?.reason ? options.reason : 'Đã hết hạn hợp đồng')

    const existingText = activeContract.contract_text?.trim() || ''
    const updatedContractText = existingText
      ? `${existingText}\n[Lý do trả phòng: ${reasonNote}]`
      : `[Lý do trả phòng: ${reasonNote}]`

    await supabase
      .from('contracts')
      .update({
        end_date: moveOutIso,
        status: isEarly ? 'terminated' : 'expired',
        contract_text: updatedContractText,
      })
      .eq('id', activeContract.id)
  }

  // 4. Giải phóng phòng
  if (tenant.room_id) {
    await supabase.from('rooms').update({ status: 'available' }).eq('id', tenant.room_id)
  }

  // 5. Gửi thông báo đến Super Admin và Manager
  try {
    const { dispatchNotification } = await import('@/lib/notification_dispatch')

    // Super Admin: Báo tịch thu cọc nếu trước hạn
    const { data: superAdmins } = await supabase.from('users').select('id').eq('role', 'super_admin')
    if (superAdmins) {
      for (const sa of superAdmins) {
        await dispatchNotification(
          supabase,
          { userId: sa.id },
          {
            title: isEarly ? 'Thanh lý trước hạn — Tịch thu cọc' : 'Trả phòng đúng hạn',
            body: isEarly
              ? `${tenantUserName} (${roomCode}) đã trả phòng trước hạn. Tiền cọc ${depositAmount.toLocaleString('vi-VN')}đ bị tịch thu.`
              : `${tenantUserName} (${roomCode}) đã hoàn tất trả phòng đúng hạn hợp đồng.`,
            type: 'contract',
            relatedId: String(tenantId),
          }
        )
      }
    }

    // Manager: Báo lên kiểm tra phòng & lập Form báo cáo hư hỏng
    const { data: managers } = await supabase.from('users').select('id').eq('role', 'manager')
    if (managers) {
      for (const mgr of managers) {
        await dispatchNotification(
          supabase,
          { userId: mgr.id },
          {
            title: 'Yêu cầu kiểm tra bàn giao phòng',
            body: `${tenantUserName} (${roomCode}) đã trả phòng. Vui lòng tiến hành kiểm tra thiết bị & lập Form báo cáo hư hỏng.`,
            type: 'ticket',
            relatedId: String(tenantId),
          }
        )
      }
    }
  } catch (notifErr) {
    console.error('Lỗi gửi thông báo trả phòng:', notifErr)
  }

  return { success: true, moveOutDate: moveOutIso, roomId: tenant.room_id, isEarly, depositAmount }
}
