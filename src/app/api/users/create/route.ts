import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole, canCreateUser } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'

function normalizeDateTimeValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra JWT của người gọi API
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const body = await request.json()
    const { phone, password, full_name, role: targetRole, branch_id: targetBranchId, room_id, email, identity_number, contractImages: rawContractImages, contractEndDate: rawContractEndDate, contract_end_date: rawContractEndDateSnake, depositAmount: rawDepositAmount, deposit_amount: rawDepositAmountSnake, updateProfile } = body
    const depositAmount = Number(rawDepositAmount ?? rawDepositAmountSnake ?? 0)

    const contractImages = Array.isArray(rawContractImages)
      ? rawContractImages.filter(
          (url: unknown): url is string => typeof url === 'string' && url.startsWith('http')
        )
      : []
    const contractEndDate = normalizeDateTimeValue(rawContractEndDate ?? rawContractEndDateSnake)

    if (!phone || !password || !targetRole || !email) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (phone, password, role, email)' }, { status: 400 })
    }

    // 2. Kiểm tra RBAC (Phân quyền)
    if (!canCreateUser(auth.role, targetRole)) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo tài khoản với vai trò này' }, { status: 403 })
    }

    if (targetRole === 'manager' || targetRole === 'tenant') {
      if (!targetBranchId) {
        return NextResponse.json({ error: `Vai trò ${targetRole} yêu cầu bắt buộc phải chọn chi nhánh` }, { status: 400 })
      }
    }

    let finalBranchId = targetBranchId
    
    // Nếu là Manager, ép buộc branch_id phải là branch của Manager, không được tạo user cho chi nhánh khác
    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Tài khoản Manager của bạn chưa được gán chi nhánh' }, { status: 403 })
      }
      finalBranchId = auth.branchId
    }

    // Đảm bảo số điện thoại định dạng đúng
    const formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone

    // Nếu tạo tenant và có gán phòng, kiểm tra xem phòng có thuộc chi nhánh không
    if (targetRole === 'tenant' && room_id) {
      const roomIdNum = Number(room_id)
      const { data: roomCheck } = await auth.supabase!
        .from('rooms')
        .select('branch_id, area')
        .eq('id', roomIdNum)
        .single()
      
      if (!roomCheck) {
        return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 })
      }
      if (auth.role === 'manager' && roomCheck.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không thể thêm khách thuê vào phòng của chi nhánh khác' }, { status: 403 })
      }
      
      // Ghi đè lại finalBranchId bằng đúng branch_id của phòng để đảm bảo tính nhất quán
      finalBranchId = roomCheck.branch_id

      // Kiểm tra giới hạn số cư dân theo diện tích phòng
      const area = Number(roomCheck.area ?? 0)
      const maxCapacity = area < 16 ? 1 : area < 24 ? 2 : 3
      const { count: currentCount } = await auth.supabase!
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomIdNum)
        .is('move_out_date', null)
      if ((currentCount ?? 0) >= maxCapacity) {
        return NextResponse.json({
          error: `Phòng đã đạt giới hạn ${maxCapacity} cư dân (diện tích ${area}m²). Không thể thêm cư dân mới.`
        }, { status: 400 })
      }
    }

    // 3. Khởi tạo Admin Client để tạo user bỏ qua OTP SMS
    const adminSupabase = createAdminClient()

    // Kiểm tra xem số điện thoại đã tồn tại dưới dạng bị xóa mềm (deleted) hoặc đang hoạt động (active) chưa
    const { data: existingProfile } = await adminSupabase
      .from('users')
      .select('id, status, phone, email, full_name')
      .or(`phone.eq.${formattedPhone},phone.like.${formattedPhone}_del_%`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let isOldTenant = false
    if (existingProfile) {
      if (existingProfile.status === 'deleted') {
        isOldTenant = true
      } else if (existingProfile.status === 'active') {
        // Kiểm tra xem họ có gán phòng nào đang active không
        const { data: activeTenants } = await adminSupabase
          .from('tenants')
          .select('id')
          .eq('user_id', existingProfile.id)
          .is('move_out_date', null)

        const isRented = activeTenants && activeTenants.length > 0
        if (!isRented) {
          isOldTenant = true
        } else {
          return NextResponse.json({ error: 'Số điện thoại này đã được sử dụng bởi một tài khoản đang hoạt động' }, { status: 400 })
        }
      }
    }

    const emailToUse = email.trim()
    const nameToUse = (existingProfile && isOldTenant && updateProfile === false)
      ? (existingProfile.full_name || full_name.trim())
      : full_name.trim()

    // 3.1. Tìm kiếm xem tài khoản trong Supabase Auth có tồn tại không để tránh tạo trùng gây lỗi
    const { data: listData } = await adminSupabase.auth.admin.listUsers()
    const authUsers = listData?.users ?? []
    
    // Tìm auth user trùng email hoặc phone
    const existingAuthUser = authUsers.find(
      (u) =>
        u.email?.toLowerCase() === emailToUse.toLowerCase() ||
        u.phone === formattedPhone ||
        (existingProfile && u.email?.toLowerCase() === existingProfile.email?.toLowerCase())
    )

    let authData: any = null
    let authError: any = null

    if (existingAuthUser) {
      // Nếu auth user đã tồn tại, ta cập nhật password mới, email mới và name mới
      const { data, error } = await adminSupabase.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          email: emailToUse,
          phone: formattedPhone,
          password: password,
          user_metadata: {
            full_name: nameToUse
          }
        }
      )
      authData = { user: data.user }
      authError = error
    } else {
      // Nếu chưa có auth user, tạo mới
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: emailToUse,
        email_confirm: true,
        phone: formattedPhone,
        password,
        phone_confirm: true, // Ép buộc xác thực SĐT để khách có thể đăng nhập ngay không cần OTP
        user_metadata: {
          full_name: nameToUse
        }
      })
      authData = data
      authError = error
    }

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Không thể tạo/cập nhật Auth User' }, { status: 400 })
    }

    let newUserProfile: any = null
    let dbError: any = null

    if (existingProfile && isOldTenant) {
      // 4. Khôi phục profile cũ (hoặc cập nhật nếu họ đã trả phòng)
      const res = await adminSupabase
        .from('users')
        .update({
          full_name: nameToUse,
          phone: formattedPhone,
          email: emailToUse,
          status: 'active',
          branch_id: finalBranchId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select()
        .single()
      newUserProfile = res.data
      dbError = res.error
    } else {
      // 4. Tạo profile mới hoàn toàn
      const res = await adminSupabase
        .from('users')
        .insert({
          full_name: nameToUse,
          phone: formattedPhone,
          role: targetRole,
          branch_id: finalBranchId || null,
          email: emailToUse
        })
        .select()
        .single()
      newUserProfile = res.data
      dbError = res.error
    }

    if (dbError || !newUserProfile) {
      // Rollback (Chỉ xóa auth user nếu nó được tạo mới trong request này)
      if (authData?.user?.id && !existingAuthUser) {
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
      }
      return NextResponse.json({ error: 'Lỗi khi ghi dữ liệu profile: ' + (dbError?.message || 'Unknown error') }, { status: 500 })
    }

    let createdTenantId: number | null = null
    let createdRoomId: number | null = null

    // 5. Nếu vai trò là tenant và có room_id, thêm thông tin vào bảng tenants và cập nhật trạng thái phòng
    if (targetRole === 'tenant' && room_id) {
      const roomIdNum = Number(room_id)
      createdRoomId = roomIdNum
      const { data: tenantData, error: tenantError } = await adminSupabase
        .from('tenants')
        .insert({
          user_id: newUserProfile.id,
          room_id: roomIdNum,
          move_in_date: new Date().toISOString(),
          identity_number: (identity_number && String(identity_number).replace(/\D/g, '')) || '000000000000'
        })
        .select()
        .single()

      if (tenantError) {
        // Rollback cả user và auth user
        await adminSupabase.from('users').delete().eq('id', newUserProfile.id)
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: 'Lỗi khi tạo hồ sơ cư dân thuê phòng: ' + tenantError.message }, { status: 500 })
      }

      createdTenantId = tenantData.id

      const { data: roomData } = await adminSupabase
        .from('rooms')
        .select('base_price')
        .eq('id', roomIdNum)
        .single()

      const contractCode = `HD-${roomIdNum}-${tenantData.id}-${Date.now().toString().slice(-4)}`
      let contractErrorMessage: string | null = null

      {
        const { error: contractError } = await adminSupabase.from('contracts').insert({
          contract_code: contractCode,
          tenant_id: tenantData.id,
          room_id: roomIdNum,
          start_date: new Date().toISOString(),
          end_date: contractEndDate,
          deposit_amount: depositAmount,
          monthly_price: roomData?.base_price ?? 0,
          status: 'active',
          ...(contractImages.length > 0 ? { contract_images: contractImages } : {}),
        })

        contractErrorMessage = contractError?.message ?? null
      }

      if (contractErrorMessage) {
        await adminSupabase.from('tenants').delete().eq('id', tenantData.id)
        await adminSupabase.from('users').delete().eq('id', newUserProfile.id)
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: 'Lỗi khi tạo hợp đồng: ' + contractErrorMessage },
          { status: 500 }
        )
      }

      // Cập nhật trạng thái phòng: đếm lại số cư dân sau khi thêm mới
      // Lấy thông tin diện tích phòng để tính capacity
      const { data: roomForCapacity } = await adminSupabase
        .from('rooms')
        .select('area')
        .eq('id', roomIdNum)
        .single()
      const roomArea = Number(roomForCapacity?.area ?? 0)
      const roomMaxCapacity = roomArea < 16 ? 1 : roomArea < 24 ? 2 : 3
      const { count: newTenantCount } = await adminSupabase
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomIdNum)
        .is('move_out_date', null)
      // Chỉ đặt sang 'occupied' sau khi thêm cư dân (luôn occupied vì đã có ít nhất 1 cư dân)
      const { error: roomUpdateError } = await adminSupabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', roomIdNum)

      if (roomUpdateError) {
        // Rollback contract, tenant, user và auth user
        await adminSupabase.from('contracts').delete().eq('tenant_id', tenantData.id)
        await adminSupabase.from('tenants').delete().eq('id', tenantData.id)
        await adminSupabase.from('users').delete().eq('id', newUserProfile.id)
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: 'Lỗi khi cập nhật trạng thái phòng: ' + roomUpdateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true, 
      message: 'Tạo tài khoản thành công',
      tenantId: createdTenantId,
      roomId: createdRoomId,
      user: {
        id: authData.user.id,
        phone: formattedPhone,
        role: targetRole,
        branch_id: finalBranchId || null
      }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
