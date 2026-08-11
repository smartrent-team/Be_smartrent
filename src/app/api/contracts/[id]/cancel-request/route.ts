import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import {
  requestContractCancellation,
  respondContractCancellation,
} from '@/lib/contract-cancellation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'tenant' && auth.role !== 'manager' && auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Không có quyền thực hiện thao tác này' }, { status: 403 })
    }

    const { id } = await params
    const contractId = Number(id)
    if (!Number.isFinite(contractId)) {
      return NextResponse.json({ error: 'ID hợp đồng không hợp lệ' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason : ''

    const result = await requestContractCancellation(
      auth.supabase!,
      contractId,
      {
        role: auth.role,
        branchId: auth.branchId ?? null,
        dbUserId: auth.dbUserId,
      },
      reason
    )

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi yêu cầu hủy hợp đồng. Đang chờ bên còn lại xử lý.',
      data: {
        cancellationRequest: result.cancellationRequest,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'tenant' && auth.role !== 'manager' && auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Không có quyền thực hiện thao tác này' }, { status: 403 })
    }

    const { id } = await params
    const contractId = Number(id)
    if (!Number.isFinite(contractId)) {
      return NextResponse.json({ error: 'ID hợp đồng không hợp lệ' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body.action === 'approve' || body.action === 'reject' ? body.action : null
    if (!action) {
      return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 })
    }

    const result = await respondContractCancellation(
      auth.supabase!,
      contractId,
      {
        role: auth.role,
        branchId: auth.branchId ?? null,
        dbUserId: auth.dbUserId,
      },
      action
    )

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'approve'
          ? 'Hợp đồng đã được hủy.'
          : 'Đã từ chối yêu cầu hủy hợp đồng.',
      data: {
        status: result.status,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
