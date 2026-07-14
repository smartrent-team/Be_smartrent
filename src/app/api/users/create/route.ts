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
    const { phone, password, full_name, role: targetRole, branch_id: targetBranchId, room_id, email, identity_number, contractImages: rawContractImages, contractEndDate: rawContractEndDate, contract_end_date: rawContractEndDateSnake, depositAmount: rawDepositAmount, deposit_amount: rawDepositAmountSnake } = body
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
        .select('branch_id')
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
    }

    // 3. Khởi tạo Admin Client để tạo user bỏ qua OTP SMS
    const adminSupabase = createAdminClient()

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      email_confirm: true,
      phone: formattedPhone,
      password,
      phone_confirm: true, // Ép buộc xác thực SĐT để khách có thể đăng nhập ngay không cần OTP
      user_metadata: {
        full_name
      }
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Không thể tạo Auth User' }, { status: 400 })
    }

    // 4. Lưu thông tin phụ vào bảng public.users (để cột id tự động sinh số nguyên integer)
    const { data: newUserProfile, error: dbError } = await adminSupabase
      .from('users')
      .insert({
        full_name,
        phone: formattedPhone,
        role: targetRole,
        branch_id: finalBranchId || null,
        email: email.trim()
      })
      .select()
      .single()

    if (dbError || !newUserProfile) {
      // Rollback (Xóa auth user nếu chèn DB thất bại)
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
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

      // Cập nhật trạng thái phòng thành occupied
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
