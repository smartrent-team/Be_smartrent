import { NextResponse, type NextRequest } from 'next/server'
import { getContractImagesById } from '@/lib/contracts'
import { getLatestEffectiveContract } from '@/lib/contract-selection'
import { verifyRole } from '@/lib/rbac'
import { changeTenantRoom } from '@/lib/tenant-room-operations'
import { formatVietnamDateDisplay } from '@/lib/date-utils'

function formatViDate(iso: string | null | undefined): string | null {
  return formatVietnamDateDisplay(iso)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền đổi phòng' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const newRoomIdRaw = body.newRoomId ?? body.roomId
    const newRoomId =
      typeof newRoomIdRaw === 'number'
        ? newRoomIdRaw
        : parseInt(String(newRoomIdRaw), 10)

    if (!Number.isFinite(newRoomId)) {
      return NextResponse.json({ error: 'Vui lòng chọn phòng mới' }, { status: 400 })
    }

    const contractImages = Array.isArray(body.contractImages) ? body.contractImages : []
    const moveInDate = typeof body.moveInDate === 'string' ? body.moveInDate : null
    const endDate = typeof body.endDate === 'string' ? body.endDate : null

    const result = await changeTenantRoom(auth.supabase!, tenantId, newRoomId, contractImages, {
      role: auth.role,
      branchId: auth.branchId ?? null,
    }, moveInDate, endDate)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const supabase = auth.supabase!
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('move_in_date, room_id')
      .eq('id', tenantId)
      .single()

    const { data: roomRow } = await supabase
      .from('rooms')
      .select('room_code, floor')
      .eq('id', result.newRoomId)
      .single()

    const { data: contractsRows } = await supabase
      .from('contracts')
      .select('id, start_date, end_date, status')
      .eq('tenant_id', tenantId)
      .order('id', { ascending: false })

    const activeContract = getLatestEffectiveContract(contractsRows || [])

    let savedContractImages: string[] = []
    if (activeContract?.id) {
      savedContractImages = await getContractImagesById(activeContract.id)
    }

    const roomCode = roomRow?.room_code
    const floor = roomRow?.floor
    let roomLabel = 'Chưa có phòng'
    if (roomCode) {
      roomLabel = floor != null ? `Phòng ${roomCode} · Tầng ${floor}` : `Phòng ${roomCode}`
    }

    const checkInDate =
      formatViDate(tenantRow?.move_in_date) ||
      formatViDate(activeContract?.start_date) ||
      'Chưa cập nhật'

    return NextResponse.json({
      success: true,
      message: 'Đã đổi phòng thành công',
      data: {
        oldRoomId: result.oldRoomId,
        newRoomId: result.newRoomId,
        roomLabel,
        checkInDate,
        contractSignDate: checkInDate,
        startDate: tenantRow?.move_in_date ?? activeContract?.start_date ?? null,
        endDate: activeContract?.end_date ?? null,
        contractImages:
          savedContractImages.length > 0 ? savedContractImages : contractImages,
      },
    })
  } catch (error: unknown) {
    console.error('Error changing tenant room:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
