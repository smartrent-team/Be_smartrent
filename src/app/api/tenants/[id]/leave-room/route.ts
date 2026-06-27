import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { leaveTenantRoom, type LeaveRoomReason } from '@/lib/tenant-room-operations'

const VALID_REASONS: LeaveRoomReason[] = ['contract_expired', 'tenant_request', 'other']

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
      return NextResponse.json({ error: 'Không có quyền thực hiện trả phòng' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const moveOutDate =
      typeof body.moveOutDate === 'string' && body.moveOutDate.trim()
        ? body.moveOutDate.trim()
        : undefined

    let reason: LeaveRoomReason | undefined
    if (typeof body.reason === 'string' && VALID_REASONS.includes(body.reason as LeaveRoomReason)) {
      reason = body.reason as LeaveRoomReason
    }

    const result = await leaveTenantRoom(auth.supabase!, tenantId, {
      role: auth.role,
      branchId: auth.branchId ?? null,
    }, { moveOutDate, reason })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const formatDate = (iso: string) => {
      try {
        return new Date(iso).toLocaleDateString('vi-VN')
      } catch {
        return iso
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xử lý trả phòng thành công',
      data: {
        moveOutDate: formatDate(result.moveOutDate),
        roomId: result.roomId,
      },
    })
  } catch (error: unknown) {
    console.error('Error leaving tenant room:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
