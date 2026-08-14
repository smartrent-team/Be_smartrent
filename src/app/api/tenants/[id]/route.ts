import { NextResponse, type NextRequest } from 'next/server'
import { getContractImagesById, updateContractImagesDirectly } from '@/lib/contracts'
import { formatVietnamDateDisplay, normalizeCalendarDateToUtcIso } from '@/lib/date-utils'
import { verifyRole } from '@/lib/rbac'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const { id } = await params
    const tenantId = parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền xem chi tiết cư dân' }, { status: 403 })
    }

    const supabase = auth.supabase!

    const { data: tenantRow, error: tenantError } = await supabase
      .from('tenants')
      .select('id, move_in_date, move_out_date, room_id, user_id, identity_number')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      if (tenantError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Không tìm thấy cư dân' }, { status: 404 })
      }
      console.error('Tenant detail – tenants:', tenantError)
      return NextResponse.json(
        { error: 'Không thể tải chi tiết cư dân', details: tenantError.message },
        { status: 400 }
      )
    }

    if (!tenantRow.user_id) {
      return NextResponse.json({ error: 'Cư dân chưa liên kết tài khoản' }, { status: 404 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, full_name, phone, role, email, status')
      .eq('id', tenantRow.user_id)
      .single()

    if (userError) {
      console.error('Tenant detail – users:', userError)
      return NextResponse.json(
        { error: 'Không thể tải thông tin người dùng', details: userError.message },
        { status: 400 }
      )
    }

    let room: {
      id: number
      room_code: string
      floor: number
      branch_id: number
    } | null = null

    if (tenantRow.room_id) {
      const { data: roomRow, error: roomError } = await supabase
        .from('rooms')
        .select('id, room_code, floor, branch_id')
        .eq('id', tenantRow.room_id)
        .single()

      if (roomError) {
        console.error('Tenant detail – rooms:', roomError)
      } else if (roomRow) {
        room = roomRow
      }
    }

    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Tài khoản Manager chưa được gán chi nhánh' }, { status: 403 })
      }
      if (room && room.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Không có quyền xem cư dân này' }, { status: 403 })
      }
    }

    const { data: contractsData } = await supabase
      .from('contracts')
      .select('id, status, start_date, end_date, deposit_amount')
      .eq('tenant_id', tenantId)
      .order('id', { ascending: false })

    const contracts = contractsData || []
    const activeContract =
      contracts.find((c) => c.status === 'active') || contracts[0] || null

    let contractImages: string[] = []
    if (activeContract?.id) {
      try {
        contractImages = await getContractImagesById(activeContract.id)
      } catch (contractError) {
        console.error('Tenant detail – contract images:', contractError)
      }
    }

    // Lấy trạng thái yêu cầu trả phòng mới nhất
    let checkoutRequestStatus: string | null = null
    let remainingContractDays: number | null = null
    if (activeContract?.id) {
      const { data: checkoutReq } = await supabase
        .from('checkout_requests')
        .select('status')
        .eq('tenant_id', tenantId)
        .eq('contract_id', activeContract.id)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      checkoutRequestStatus = checkoutReq?.status ?? null

      if (activeContract.end_date) {
        const endDate = new Date(activeContract.end_date)
        const diffMs = endDate.getTime() - Date.now()
        remainingContractDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      }
    }

    const fullName = userRow.full_name || 'Không tên'
    const nameParts = fullName.trim().split(' ')
    const initial =
      nameParts.length > 0 ? nameParts[nameParts.length - 1][0].toUpperCase() : 'C'

    const isLocked = userRow.status === 'locked' || userRow.status === 'blocked'
    const isActive = !isLocked
    const roomCode = room?.room_code
    const floor = room?.floor

    let roomLabel = 'Chưa có phòng'
    if (roomCode) {
      roomLabel = floor != null ? `Phòng ${roomCode} · Tầng ${floor}` : `Phòng ${roomCode}`
    }

    const moveInDisplay =
      formatVietnamDateDisplay(tenantRow.move_in_date) ||
      formatVietnamDateDisplay(activeContract?.start_date) ||
      'Chưa cập nhật'

    return NextResponse.json(
      {
        success: true,
        data: {
          id: tenantRow.id,
          name: fullName,
          phone: userRow.phone || 'Chưa cập nhật',
          email: userRow.email || null,
          checkInDate: moveInDisplay,
          moveOutDate: formatVietnamDateDisplay(tenantRow.move_out_date),
          contractSignDate: moveInDisplay,
          isRoomHead: userRow.role === 'owner',
          initial,
          roomId: room?.id ?? tenantRow.room_id,
          roomCode: roomCode || null,
          floor: floor ?? null,
          roomLabel,
          isActive,
          statusLabel: isLocked ? 'Khóa' : 'Đang ở',
          depositAmount: activeContract?.deposit_amount ?? null,
          contractImages,
          userId: userRow.id,
          activeContractId: activeContract?.id ?? null,
          contractEndDate: activeContract?.end_date ?? null,
          checkoutRequestStatus,
          remainingContractDays,
          identityNumber: (() => {
            const raw = tenantRow.identity_number as string | null
            if (!raw || raw === '000000000000') return null
            return raw
          })(),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: unknown) {
    console.error('Error fetching tenant detail:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}

function parseMoveInDate(input: string): string | null {
  return normalizeCalendarDateToUtcIso(input)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền cập nhật cư dân' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const moveInDateRaw = typeof body.moveInDate === 'string' ? body.moveInDate.trim() : ''
    const isActive = body.isActive !== false
    const contractImages = Array.isArray(body.contractImages)
      ? body.contractImages.filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
      : undefined

    if (!fullName) {
      return NextResponse.json({ error: 'Vui lòng nhập họ tên' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'Vui lòng nhập số điện thoại' }, { status: 400 })
    }
    if (!moveInDateRaw) {
      return NextResponse.json({ error: 'Vui lòng chọn ngày dọn vào' }, { status: 400 })
    }

    const moveInIso = parseMoveInDate(moveInDateRaw)
    if (!moveInIso) {
      return NextResponse.json({ error: 'Ngày dọn vào không hợp lệ' }, { status: 400 })
    }

    const formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone

    const supabase = auth.supabase!

    const { data: tenantRow, error: tenantError } = await supabase
      .from('tenants')
      .select('id, move_out_date, room_id, user_id')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenantRow) {
      if (tenantError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Không tìm thấy cư dân' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'Không thể tải hồ sơ cư dân', details: tenantError?.message },
        { status: 400 }
      )
    }

    if (!tenantRow.user_id) {
      return NextResponse.json({ error: 'Cư dân chưa liên kết tài khoản' }, { status: 404 })
    }

    let roomBranchId: number | null = null
    if (tenantRow.room_id) {
      const { data: roomRow } = await supabase
        .from('rooms')
        .select('branch_id')
        .eq('id', tenantRow.room_id)
        .single()
      roomBranchId = roomRow?.branch_id ?? null
    }

    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Tài khoản Manager chưa được gán chi nhánh' }, { status: 403 })
      }
      if (roomBranchId != null && roomBranchId !== auth.branchId) {
        return NextResponse.json({ error: 'Không có quyền cập nhật cư dân này' }, { status: 403 })
      }
    }

    const moveOutIso = isActive
      ? null
      : tenantRow.move_out_date || new Date().toISOString()

    const { error: profileError } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        phone: formattedPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantRow.user_id)

    if (profileError) {
      if (profileError.message?.includes('users_email_idx') || profileError.code === '23505') {
        return NextResponse.json({ error: 'Số điện thoại hoặc email đã được sử dụng' }, { status: 400 })
      }
      return NextResponse.json(
        { error: 'Không thể cập nhật thông tin người dùng', details: profileError.message },
        { status: 400 }
      )
    }

    const { error: tenantUpdateError } = await supabase
      .from('tenants')
      .update({
        move_in_date: moveInIso,
        move_out_date: moveOutIso,
      })
      .eq('id', tenantId)

    if (tenantUpdateError) {
      return NextResponse.json(
        { error: 'Không thể cập nhật hồ sơ thuê phòng', details: tenantUpdateError.message },
        { status: 400 }
      )
    }

    const { data: activeContract } = await supabase
      .from('contracts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle()

    if (activeContract?.id) {
      const contractUpdate: {
        start_date: string
        end_date: string | null
        status?: string
      } = {
        start_date: moveInIso,
        end_date: moveOutIso,
      }

      if (moveOutIso) {
        contractUpdate.status = 'expired'
      }

      await supabase.from('contracts').update(contractUpdate).eq('id', activeContract.id)

      if (contractImages !== undefined) {
        await updateContractImagesDirectly(activeContract.id, contractImages)
      }
    }

    if (tenantRow.room_id) {
      const roomStatus = moveOutIso ? 'available' : 'occupied'
      await supabase.from('rooms').update({ status: roomStatus }).eq('id', tenantRow.room_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error updating tenant:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
