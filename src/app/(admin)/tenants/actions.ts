'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'

async function verifySuperAdmin(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Chưa đăng nhập')
  const { data: profile } = await supabase.from('users').select('role').eq('email', user.email).single()
  if (profile?.role !== 'super_admin') {
    throw new Error('Bạn không có quyền thực hiện hành động này (Yêu cầu Super Admin)')
  }
}

export async function createTenantAction(data: {
  fullName: string
  phone: string
  password?: string
  roomId: string
  depositAmount: number
  moveInDate: string
}) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  if (!data.fullName || !data.phone || !data.roomId || !data.moveInDate) {
    throw new Error('Vui lòng nhập đầy đủ thông tin bắt buộc')
  }

  const newRoomId = parseInt(data.roomId, 10)
  const adminSupabase = createAdminClient()
  
  // Lấy chi nhánh của phòng để gán cho User (dùng admin để bypass RLS)
  const { data: room, error: roomError } = await adminSupabase
    .from('rooms')
    .select('branch_id')
    .eq('id', newRoomId)
    .single()

  if (roomError || !room) throw new Error('Không tìm thấy phòng được chọn')
  const branchId = room.branch_id

  const formattedPhone = data.phone.startsWith('0') ? `+84${data.phone.slice(1)}` : data.phone

  // 1. Tạo tài khoản trong Supabase Auth
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    phone: formattedPhone,
    password: data.password || '123456',
    phone_confirm: true,
    user_metadata: {
      full_name: data.fullName
    }
  })

  if (authError || !authData.user) {
    console.error('Lỗi khi tạo Auth User cho Khách thuê:', authError)
    throw new Error('Lỗi khởi tạo tài khoản Auth: ' + (authError?.message || 'Không xác định được lỗi Auth'))
  }

  const authUserId = authData.user.id
  let newUserProfile: { id: number } | null = null
  let newTenant: { id: number } | null = null

  try {
    // 2. Tạo profile trong public.users (tự sinh ID integer)
    const { data: profileData, error: profileError } = await adminSupabase
      .from('users')
      .insert({
        full_name: data.fullName.trim(),
        phone: formattedPhone,
        role: 'tenant',
        branch_id: branchId,
        email: `${formattedPhone.replace('+', '')}@user.local`
      })
      .select()
      .single()

    if (profileError || !profileData) throw profileError || new Error('Không thể tạo thông tin người dùng')
    newUserProfile = profileData

    // 3. Tạo hồ sơ khách thuê trong public.tenants
    const { data: tenantData, error: tenantError } = await adminSupabase
      .from('tenants')
      .insert({
        user_id: profileData.id,  // integer FK đến public.users.id
        room_id: newRoomId,
        move_in_date: new Date(data.moveInDate).toISOString(),
        identity_number: '000000000000' // Tránh lỗi NOT NULL của database
      })
      .select()
      .single()

    if (tenantError || !tenantData) throw tenantError || new Error('Không thể tạo hồ sơ khách thuê')
    newTenant = tenantData

    // 4. Tạo hợp đồng trong public.contracts
    const contractCode = `HD-${newRoomId}-${tenantData.id}-${Date.now().toString().slice(-4)}`
    
    // Lấy giá phòng
    const { data: roomData } = await adminSupabase
      .from('rooms')
      .select('base_price')
      .eq('id', newRoomId)
      .single()

    const { error: contractError } = await adminSupabase.from('contracts').insert({
      contract_code: contractCode,
      tenant_id: tenantData.id,
      room_id: newRoomId,
      start_date: new Date(data.moveInDate).toISOString(),
      deposit_amount: data.depositAmount,
      monthly_price: roomData?.base_price || 0,
      status: 'active'
    })

    if (contractError) throw contractError

    // 5. Cập nhật trạng thái phòng thành 'occupied' (Đã thuê)
    await adminSupabase.from('rooms').update({ status: 'occupied' }).eq('id', newRoomId)

  } catch (error: supa) {
    const errMsg = error instanceof Error 
      ? error.message 
      : (error && typeof error === 'object' && 'message' in error)
        ? `${error.message}${error.details ? ' - ' + error.details : ''}`
        : JSON.stringify(error)
    
    console.error('Rollback tạo khách thuê do lỗi chi tiết:', error)
    
    // Rollback
    if (newTenant?.id) {
      await adminSupabase.from('contracts').delete().eq('tenant_id', newTenant.id)
    }
    if (newUserProfile?.id) {
      await adminSupabase.from('tenants').delete().eq('user_id', newUserProfile.id)
      await adminSupabase.from('users').delete().eq('id', newUserProfile.id)
    }
    if (authUserId) {
      await adminSupabase.auth.admin.deleteUser(authUserId)
    }
    throw new Error('Lỗi ghi dữ liệu: ' + errMsg)
  }

  revalidatePath('/tenants')
  revalidatePath('/rooms')
}

export async function editTenantAction(
  id: number,
  userIntId: number,  // integer ID trong public.users
  data: {
    fullName: string
    phone: string
    password?: string
    roomId: string
    depositAmount: number
    moveInDate: string
    moveOutDate?: string
  }
) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  if (!data.fullName || !data.phone || !data.roomId || !data.moveInDate) {
    throw new Error('Họ tên, SĐT, Phòng và ngày dời vào là bắt buộc')
  }

  const newRoomId = parseInt(data.roomId, 10)
  const formattedPhone = data.phone.startsWith('0') ? `+84${data.phone.slice(1)}` : data.phone
  const adminSupabase = createAdminClient()

  // 1. Lấy profile hiện tại để tìm phone và cập nhật Auth (nếu cần)
  const { data: currentProfile } = await adminSupabase
    .from('users')
    .select('phone')
    .eq('id', userIntId)
    .single()

  // Cập nhật Auth User (tìm theo phone cũ)
  if (currentProfile?.phone) {
    const updateAuthData: { phone?: string; phone_confirm?: boolean; password?: string } = {}
    if (formattedPhone && formattedPhone !== currentProfile.phone) {
      updateAuthData.phone = formattedPhone
      updateAuthData.phone_confirm = true
    }
    if (data.password && data.password.trim() !== '') {
      updateAuthData.password = data.password
    }
    if (Object.keys(updateAuthData).length > 0) {
      // Tìm auth user bằng phone để lấy UUID
      const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
      const authUser = authUsers?.users?.find(u => u.phone === currentProfile.phone)
      if (authUser) {
        const { error: authError } = await adminSupabase.auth.admin.updateUserById(authUser.id, updateAuthData)
        if (authError) {
          console.error('Lỗi cập nhật Auth User Khách thuê:', authError)
          // Không throw lỗi ở đây, tiếp tục cập nhật profile
        }
      }
    }
  }

  // 2. Lấy thông tin chi nhánh của phòng mới
  const { data: newRoom } = await adminSupabase.from('rooms').select('branch_id').eq('id', newRoomId).single()
  const branchId = newRoom?.branch_id || null

  // 3. Cập nhật profile trong public.users
  const { error: userError } = await adminSupabase.from('users').update({
    full_name: data.fullName.trim(),
    phone: formattedPhone,
    branch_id: branchId
  }).eq('id', userIntId)

  if (userError) throw new Error('Lỗi cập nhật Profile: ' + userError.message)

  // 4. Lấy phòng cũ để cập nhật trạng thái nếu đổi phòng
  const { data: oldTenant } = await adminSupabase.from('tenants').select('room_id').eq('id', id).single()
  const oldRoomId = oldTenant?.room_id

  // 5. Cập nhật thông tin trong public.tenants
  const { error: tenantError } = await adminSupabase.from('tenants').update({
    room_id: newRoomId,
    move_in_date: new Date(data.moveInDate).toISOString(),
    move_out_date: data.moveOutDate ? new Date(data.moveOutDate).toISOString() : null
  }).eq('id', id)

  if (tenantError) throw new Error('Lỗi cập nhật hồ sơ thuê phòng: ' + tenantError.message)

  // Cập nhật hoặc thêm tiền cọc vào bảng contracts
  const { data: activeContract } = await adminSupabase
    .from('contracts')
    .select('id')
    .eq('tenant_id', id)
    .eq('status', 'active')
    .single()

  if (activeContract) {
    await adminSupabase
      .from('contracts')
      .update({
        room_id: newRoomId,
        deposit_amount: data.depositAmount,
        start_date: new Date(data.moveInDate).toISOString(),
        end_date: data.moveOutDate ? new Date(data.moveOutDate).toISOString() : null
      })
      .eq('id', activeContract.id)
  } else {
    const contractCode = `HD-${newRoomId}-${id}-${Date.now().toString().slice(-4)}`
    
    // Lấy giá phòng
    const { data: roomData } = await adminSupabase
      .from('rooms')
      .select('base_price')
      .eq('id', newRoomId)
      .single()

    await adminSupabase.from('contracts').insert({
      contract_code: contractCode,
      tenant_id: id,
      room_id: newRoomId,
      start_date: new Date(data.moveInDate).toISOString(),
      end_date: data.moveOutDate ? new Date(data.moveOutDate).toISOString() : null,
      deposit_amount: data.depositAmount,
      monthly_price: roomData?.base_price || 0,
      status: 'active'
    })
  }

  // 6. Cập nhật trạng thái phòng cũ và mới nếu đổi phòng
  if (oldRoomId !== newRoomId) {
    if (oldRoomId) {
      await adminSupabase.from('rooms').update({ status: 'available' }).eq('id', oldRoomId)
    }
    await adminSupabase.from('rooms').update({ status: 'occupied' }).eq('id', newRoomId)
  }

  // 7. Nếu khách hàng trả phòng (có ngày dời ra), giải phóng phòng thành 'available'
  if (data.moveOutDate) {
    await adminSupabase.from('rooms').update({ status: 'available' }).eq('id', newRoomId)
  }

  revalidatePath('/tenants')
  revalidatePath('/rooms')
}

export async function deleteTenantAction(id: number, userIntId: number) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

  const adminSupabase = createAdminClient()

  // 1. Giải phóng phòng trống nếu đang thuê
  const { data: tenant } = await adminSupabase.from('tenants').select('room_id').eq('id', id).single()
  if (tenant?.room_id) {
    await adminSupabase.from('rooms').update({ status: 'available' }).eq('id', tenant.room_id)
  }

  // Xóa các hợp đồng liên quan
  await adminSupabase.from('contracts').delete().eq('tenant_id', id)

  // 2. Xóa thông tin thuê
  const { error: tenantError } = await adminSupabase.from('tenants').delete().eq('id', id)
  if (tenantError) throw new Error('Lỗi xóa hồ sơ khách thuê: ' + tenantError.message)

  // Tìm số điện thoại để xóa tài khoản Supabase Auth
  const { data: userProfile } = await adminSupabase.from('users').select('phone').eq('id', userIntId).single()

  // 3. Xóa profile trong users
  const { error: userError } = await adminSupabase.from('users').delete().eq('id', userIntId)
  if (userError) throw new Error('Lỗi xóa Profile khách thuê: ' + userError.message)

  // 4. Xóa tài khoản Auth trên Supabase Auth bằng cách tìm theo SĐT
  if (userProfile?.phone) {
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
    const authUser = authUsers.users.find(u => u.phone === userProfile.phone)
    if (authUser) {
      const { error: authError } = await adminSupabase.auth.admin.deleteUser(authUser.id)
      if (authError) console.error('Lỗi khi xóa tài khoản Auth khách thuê:', authError.message)
    }
  }

  revalidatePath('/tenants')
  revalidatePath('/rooms')
}
