'use server'

import { verifySuperAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { dispatchNotification } from '@/lib/notification_dispatch'

export async function checkTenantPhoneAction(phone: string) {
  await verifySuperAdmin()
  const adminSupabase = createAdminClient()
  const cleanPhone = phone.replace(/\s+/g, '')
  const formattedPhone = cleanPhone.startsWith('0') ? `+84${cleanPhone.slice(1)}` : cleanPhone

  const { data } = await adminSupabase
    .from('users')
    .select('full_name, email, status')
    .or(`phone.eq.${formattedPhone},phone.like.${formattedPhone}_del_%`)
    .order('updated_at', { ascending: false })
    .maybeSingle()

  if (data) {
    if (data.email && data.email.includes('_del_')) {
      data.email = data.email.split('_del_')[0]
    }
  }

  return data
}

export async function createTenantAction(data: {
  fullName: string
  phone: string
  email: string
  password?: string
  roomId: string
  depositAmount: number
  moveInDate: string
  updateProfile?: boolean
}) {
  await verifySuperAdmin()

  if (!data.fullName || !data.phone || !data.email || !data.roomId || !data.moveInDate) {
    throw new Error('Vui lòng nhập đầy đủ thông tin bắt buộc')
  }

  const newRoomId = parseInt(data.roomId, 10)
  const adminSupabase = createAdminClient()
  
  // Lấy chi nhánh của phòng để gán cho User (dùng admin để bypass RLS)
  const { data: room, error: roomError } = await adminSupabase
    .from('rooms')
    .select('branch_id, status, base_price')
    .eq('id', newRoomId)
    .single()

  if (roomError || !room) throw new Error('Không tìm thấy phòng được chọn')
  if (room.status !== 'available') throw new Error('Phòng này hiện đã có người ở hoặc không khả dụng')
  
  const branchId = room.branch_id
  const cleanPhone = data.phone.replace(/\s+/g, '')
  const formattedPhone = cleanPhone.startsWith('0') ? `+84${cleanPhone.slice(1)}` : cleanPhone

  // 1. Kiểm tra xem có profile cũ nào bị vô hiệu hóa (xóa mềm) trùng SĐT không
  const { data: existingProfile } = await adminSupabase
    .from('users')
    .select('id, status, phone, email, full_name')
    .or(`phone.eq.${formattedPhone},phone.like.${formattedPhone}_del_%`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let authUserId: string | null = null
  let newUserProfile: { id: number } | null = null
  let newTenant: { id: number } | null = null

  try {
    let profileData: any = null

    if (existingProfile && existingProfile.status === 'active') {
      profileData = existingProfile
      if (data.updateProfile !== false) {
        const res = await adminSupabase.from('users').update({
          full_name: data.fullName.trim(),
          email: data.email.trim(),
          updated_at: new Date().toISOString()
        }).eq('id', existingProfile.id).select().single()
        profileData = res.data || profileData
      }
    } else {
      let emailToUse = data.email.trim()
      let nameToUse = data.fullName.trim()
      
      if (existingProfile && existingProfile.status === 'deleted' && data.updateProfile === false) {
        emailToUse = existingProfile.email ? existingProfile.email.split('_del_')[0] : data.email.trim()
        nameToUse = existingProfile.full_name || data.fullName.trim()
      }

      // 1. Tạo tài khoản trong Supabase Auth với cả Email và SĐT
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: emailToUse,
        email_confirm: true,
        phone: formattedPhone,
        password: data.password || '123456',
        phone_confirm: true,
        user_metadata: {
          full_name: nameToUse
        }
      })

      if (authError || !authData.user) {
        console.error('Lỗi khi tạo Auth User cho Khách thuê:', authError)
        throw new Error('Lỗi khởi tạo tài khoản Auth: ' + (authError?.message || 'Không xác định được lỗi Auth'))
      }
      authUserId = authData.user.id

      if (existingProfile && existingProfile.status === 'deleted') {
        // Phục hồi profile cũ
        const res = await adminSupabase
          .from('users')
          .update({
            full_name: nameToUse,
            phone: formattedPhone,
            email: emailToUse,
            status: 'active',
            branch_id: branchId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id)
          .select()
          .single()
        profileData = res.data
      } else {
        // Tạo profile mới
        const res = await adminSupabase
          .from('users')
          .insert({
            full_name: data.fullName.trim(),
            phone: formattedPhone,
            role: 'tenant',
            branch_id: branchId,
            email: data.email.trim()
          })
          .select()
          .single()
        profileData = res.data
      }
    }

    if (!profileData) throw new Error('Không thể tạo hoặc phục hồi thông tin người dùng')
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
    
    const { error: contractError } = await adminSupabase.from('contracts').insert({
      contract_code: contractCode,
      tenant_id: tenantData.id,
      room_id: newRoomId,
      start_date: new Date(data.moveInDate).toISOString(),
      deposit_amount: data.depositAmount,
      monthly_price: room.base_price || 0,
      status: 'active'
    })

    if (contractError) throw contractError

    // 5. Cập nhật trạng thái phòng thành 'occupied' (Đã thuê)
    await adminSupabase.from('rooms').update({ status: 'occupied' }).eq('id', newRoomId)

    // 6. Gửi thông báo hợp đồng mới cho tenant
    if (profileData?.id) {
      try {
        await dispatchNotification(
          adminSupabase,
          { userId: String(profileData.id), tenantId: tenantData.id },
          {
            title: 'Hợp đồng thuê phòng mới',
            body: `Hợp đồng ${contractCode} phòng ${newRoomId} đã được tạo. Ngày bắt đầu: ${new Date(data.moveInDate).toLocaleDateString('vi-VN')}. Chào mừng bạn!`,
            type: 'contract',
            relatedId: `contract:new`,
          }
        )
      } catch (notifyErr) {
        console.error('Lỗi gửi thông báo hợp đồng mới:', notifyErr)
      }
    }

  } catch (error: unknown) {
    const err = error as Record<string, unknown>
    const errMsg = error instanceof Error 
      ? error.message 
      : (err && typeof err === 'object' && 'message' in err)
        ? `${String(err.message)}${err.details ? ' - ' + String(err.details) : ''}`
        : JSON.stringify(err)
    
    console.error('Rollback tạo khách thuê do lỗi chi tiết:', error)
    
    // Rollback
    if (newTenant?.id) {
      await adminSupabase.from('contracts').delete().eq('tenant_id', newTenant.id)
    }
    if (newUserProfile?.id && authUserId) {
      // Chỉ rollback users table nếu ta vừa tạo auth user mới
      await adminSupabase.from('tenants').delete().eq('user_id', newUserProfile.id)
      if (!existingProfile) {
        await adminSupabase.from('users').delete().eq('id', newUserProfile.id)
      }
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
    email: string
    password?: string
    roomId: string
    depositAmount: number
    moveInDate: string
    moveOutDate?: string
    deactivateAccount?: boolean
  }
) {
  await verifySuperAdmin()

  if (!data.fullName || !data.phone || !data.email || !data.roomId || !data.moveInDate) {
    throw new Error('Họ tên, SĐT, Email, Phòng và ngày dời vào là bắt buộc')
  }

  const newRoomId = parseInt(data.roomId, 10)
  const cleanPhone = data.phone.replace(/\s+/g, '')
  const formattedPhone = cleanPhone.startsWith('0') ? `+84${cleanPhone.slice(1)}` : cleanPhone
  const adminSupabase = createAdminClient()

  // 1. Lấy profile hiện tại để tìm phone và cập nhật Auth (nếu cần)
  const { data: currentProfile } = await adminSupabase
    .from('users')
    .select('phone, email')
    .eq('id', userIntId)
    .single()

  // Lấy phòng cũ để cập nhật trạng thái nếu đổi phòng
  const { data: oldTenant } = await adminSupabase.from('tenants').select('room_id').eq('id', id).single()
  const oldRoomId = oldTenant?.room_id

  // Kiểm tra phòng mới nếu đổi phòng
  const { data: room, error: roomError } = await adminSupabase
    .from('rooms')
    .select('branch_id, status, base_price')
    .eq('id', newRoomId)
    .single()

  if (roomError || !room) throw new Error('Không tìm thấy phòng được chọn')
  if (oldRoomId !== newRoomId && room.status !== 'available') {
    throw new Error('Phòng mới được chọn không khả dụng hoặc đã có người ở')
  }
  const newBranchId = room.branch_id

  // Cập nhật Auth User (tìm theo phone cũ)
  if (currentProfile?.phone) {
    const updateAuthData: { phone?: string; phone_confirm?: boolean; password?: string; email?: string; email_confirm?: boolean } = {}
    if (formattedPhone && formattedPhone !== currentProfile.phone) {
      updateAuthData.phone = formattedPhone
      updateAuthData.phone_confirm = true
    }
    if (data.email && data.email.trim() !== currentProfile.email) {
      updateAuthData.email = data.email.trim()
      updateAuthData.email_confirm = true
    }
    if (data.password && data.password.trim() !== '') {
      updateAuthData.password = data.password
    }
    
    if (Object.keys(updateAuthData).length > 0 || data.deactivateAccount) {
      let page = 1;
      let foundAuthUser = null;
      while (true) {
        const { data: authUsers } = await adminSupabase.auth.admin.listUsers({ page, perPage: 1000 })
        if (!authUsers || !authUsers.users || authUsers.users.length === 0) break;
        const u = authUsers.users.find(x => x.phone === currentProfile.phone || x.email === currentProfile.email)
        if (u) {
          foundAuthUser = u;
          break;
        }
        if (authUsers.users.length < 1000) break;
        page++;
      }

      if (foundAuthUser) {
        if (data.deactivateAccount) {
          const { error: authError } = await adminSupabase.auth.admin.deleteUser(foundAuthUser.id)
          if (authError) console.error('Lỗi khi xóa tài khoản Auth khách thuê:', authError)
        } else if (Object.keys(updateAuthData).length > 0) {
          const { error: authError } = await adminSupabase.auth.admin.updateUserById(foundAuthUser.id, updateAuthData)
          if (authError) {
            throw new Error('Lỗi cập nhật hệ thống đăng nhập: ' + authError.message)
          }
        }
      }
    }
  }

  // 3. Cập nhật thông tin trong bảng users
  interface UpdateProfileData {
    full_name: string;
    branch_id: number;
    updated_at: string;
    status?: string;
    phone?: string | null;
    email?: string | null;
  }
  const updateProfileData: UpdateProfileData = {
    full_name: data.fullName,
    branch_id: newBranchId,
    updated_at: new Date().toISOString()
  }

  if (data.deactivateAccount) {
    updateProfileData.status = 'deleted'
    updateProfileData.phone = currentProfile?.phone ? `${currentProfile.phone}_del_${userIntId}` : null
    updateProfileData.email = currentProfile?.email ? `${currentProfile.email}_del_${userIntId}` : null
  } else {
    updateProfileData.phone = formattedPhone
    updateProfileData.email = data.email
  }

  const { error: profileError } = await adminSupabase
    .from('users')
    .update(updateProfileData)
    .eq('id', userIntId)

  if (profileError) {
    if (profileError.message?.includes('users_email_idx') || profileError.code === '23505') {
      throw new Error('Email này đã được sử dụng bởi một tài khoản khác.')
    }
    throw new Error('Lỗi cập nhật Profile: ' + profileError.message)
  }

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
        end_date: data.moveOutDate ? new Date(data.moveOutDate).toISOString() : null,
        ...(oldRoomId !== newRoomId ? { monthly_price: room.base_price || 0 } : {})
      })
      .eq('id', activeContract.id)
  } else {
    const contractCode = `HD-${newRoomId}-${id}-${Date.now().toString().slice(-4)}`
    
    await adminSupabase.from('contracts').insert({
      contract_code: contractCode,
      tenant_id: id,
      room_id: newRoomId,
      start_date: new Date(data.moveInDate).toISOString(),
      end_date: data.moveOutDate ? new Date(data.moveOutDate).toISOString() : null,
      deposit_amount: data.depositAmount,
      monthly_price: room.base_price || 0,
      status: 'active'
    })

    // Gửi thông báo hợp đồng mới cho tenant
    const { data: tenantUserInfo } = await adminSupabase
      .from('users')
      .select('id')
      .eq('id', userIntId)
      .maybeSingle()
    if (tenantUserInfo?.id) {
      try {
        await dispatchNotification(
          adminSupabase,
          { userId: String(tenantUserInfo.id), tenantId: id },
          {
            title: 'Hợp đồng thuê phòng mới',
            body: `Hợp đồng ${contractCode} phòng ${newRoomId} đã được tạo. Ngày bắt đầu: ${new Date(data.moveInDate).toLocaleDateString('vi-VN')}.`,
            type: 'contract',
            relatedId: `contract:new`,
          }
        )
      } catch (notifyErr) {
        console.error('Lỗi gửi thông báo hợp đồng mới:', notifyErr)
      }
    }
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
  await verifySuperAdmin()

  const adminSupabase = createAdminClient()

  // 1. Giải phóng phòng trống nếu đang thuê
  const { data: tenant } = await adminSupabase.from('tenants').select('room_id').eq('id', id).single()
  if (tenant?.room_id) {
    await adminSupabase.from('rooms').update({ status: 'available' }).eq('id', tenant.room_id)
  }

  // 2. Cập nhật ngày chuyển đi (move_out_date) cho hồ sơ thuê
  const { error: tenantError } = await adminSupabase
    .from('tenants')
    .update({ move_out_date: new Date().toISOString() })
    .eq('id', id)
  if (tenantError) throw new Error('Lỗi cập nhật hồ sơ khách thuê: ' + tenantError.message)

  // 3. Cập nhật hợp đồng thành trạng thái kết thúc (expired/cancelled)
  await adminSupabase
    .from('contracts')
    .update({ status: 'expired', end_date: new Date().toISOString() })
    .eq('tenant_id', id)
    .eq('status', 'active')

  // Tìm số điện thoại để xóa tài khoản Supabase Auth
  const { data: userProfile } = await adminSupabase.from('users').select('phone, email').eq('id', userIntId).single()

  // 4. Xóa mềm profile trong users và giải phóng SĐT/Email
  const { error: userError } = await adminSupabase
    .from('users')
    .update({ 
      status: 'deleted',
      phone: userProfile?.phone ? `${userProfile.phone}_del_${userIntId}` : null,
      email: userProfile?.email ? `${userProfile.email}_del_${userIntId}` : null
    })
    .eq('id', userIntId)
  if (userError) throw new Error('Lỗi xóa mềm Profile khách thuê: ' + userError.message)

  // 5. Xóa tài khoản Auth trên Supabase Auth bằng cách tìm theo SĐT
  if (userProfile?.phone) {
    let page = 1;
    let foundUserId: string | null = null;
    while (true) {
      const { data: authUsers } = await adminSupabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (!authUsers || !authUsers.users || authUsers.users.length === 0) break;
      const authUser = authUsers.users.find(u => u.phone === userProfile.phone || u.email === userProfile.email)
      if (authUser) {
        foundUserId = authUser.id;
        break;
      }
      if (authUsers.users.length < 1000) break;
      page++;
    }
    
    if (foundUserId) {
      const { error: authError } = await adminSupabase.auth.admin.deleteUser(foundUserId)
      if (authError) console.error('Lỗi khi xóa tài khoản Auth khách thuê:', authError.message)
    }
  }

  revalidatePath('/tenants')
  revalidatePath('/rooms')
}

export async function lockTenantUserAction(userId: string, reason: string, isLocked: boolean = true) {
  await verifySuperAdmin()
  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('users')
    .update({ status: isLocked ? 'locked' : 'active' })
    .eq('id', userId)

  if (error) throw new Error('Không thể cập nhật trạng thái tài khoản: ' + error.message)

  try {
    await dispatchNotification(
      adminSupabase,
      { userId },
      {
        title: isLocked ? 'Tài khoản đã bị khóa' : 'Tài khoản đã mở khóa',
        body: isLocked
          ? `Tài khoản của bạn đã bị khóa. Lý do: ${reason}`
          : 'Tài khoản của bạn đã được mở khóa hoạt động bình thường.',
        type: 'system',
      }
    )
  } catch (_) {}

  revalidatePath('/tenants')
  revalidatePath(`/tenants/${userId}`)
  return { success: true }
}
