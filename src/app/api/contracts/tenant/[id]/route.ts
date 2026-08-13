import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import { getContractImagesById } from '@/lib/contracts'
import { buildCancellationPayload } from '@/lib/contract-cancellation'
import { toVietnamDateKey } from '@/lib/date-utils'

type TenantRow = {
  id: number
  user_id: string
  room_id: number | null
  move_in_date: string
  move_out_date: string | null
  room?: {
    id: number
    room_code: string
    branch_id: number | null
    branch?: {
      name: string
    } | null
  } | null
}

type ContractRow = {
  id: number
  tenant_id: number
  room_id: number
  status: string
  deposit_amount: number | null
  start_date: string
  end_date: string | null
  cancel_request_status?: string | null
  cancel_requested_by?: string | null
  cancel_reason?: string | null
  cancel_requested_at?: string | null
}

function formatRemainingDays(endDate: string | null): number {
  if (!endDate) return 0

  const endKey = toVietnamDateKey(endDate)
  if (!endKey) return 0

  const todayKey = toVietnamDateKey(new Date().toISOString())
  if (!todayKey) return 0

  const [ey, em, ed] = endKey.split('-').map(Number)
  const [ty, tm, td] = todayKey.split('-').map(Number)
  const endMs = Date.UTC(ey, em - 1, ed)
  const todayMs = Date.UTC(ty, tm - 1, td)
  const diffDays = Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

async function loadContractsForTenant(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: number
): Promise<ContractRow[]> {
  const withCancellation = await supabase
    .from('contracts')
    .select(
      'id, tenant_id, room_id, status, deposit_amount, start_date, end_date, cancel_request_status, cancel_requested_by, cancel_reason, cancel_requested_at'
    )
    .eq('tenant_id', tenantId)
    .order('id', { ascending: false })

  if (!withCancellation.error) {
    return (withCancellation.data ?? []) as ContractRow[]
  }

  const message = withCancellation.error.message ?? ''
  if (!message.includes('cancel_')) {
    console.error('[contracts/tenant] contracts query failed:', withCancellation.error)
    return []
  }

  const basic = await supabase
    .from('contracts')
    .select('id, status, deposit_amount, start_date, end_date')
    .eq('tenant_id', tenantId)
    .order('id', { ascending: false })

  if (basic.error) {
    console.error('[contracts/tenant] basic contracts query failed:', basic.error)
    return []
  }

  return (basic.data ?? []) as ContractRow[]
}

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
    const tenantId = Number(id)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        id,
        user_id,
        room_id,
        move_in_date,
        move_out_date,
        room:rooms(
          id,
          room_code,
          branch_id,
          branch:branches(name)
        )
      `)
      .eq('id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Không tìm thấy cư dân' }, { status: 404 })
      }
      console.error('[contracts/tenant] tenant query failed:', error)
      return NextResponse.json(
        { error: 'Không thể tải hợp đồng của cư dân này', details: error.message },
        { status: 400 }
      )
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Không tìm thấy cư dân' }, { status: 404 })
    }

    const tenantRow = tenant as unknown as TenantRow

    if (auth.role === 'tenant' && auth.dbUserId !== tenantRow.user_id) {
      return NextResponse.json({ error: 'Bạn không có quyền xem hợp đồng này' }, { status: 403 })
    }

    if (auth.role === 'manager' && auth.branchId != null) {
      const branchId = tenantRow.room?.branch_id
      if (branchId != null && branchId !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không có quyền xem hợp đồng của chi nhánh khác' }, { status: 403 })
      }
    }

    const contracts = await loadContractsForTenant(supabase, tenantId)
    const activeContract =
      contracts.find((contract) => contract.status === 'active') ?? contracts[0] ?? null

    if (!activeContract) {
      return NextResponse.json(
        { error: 'Không tìm thấy hợp đồng hiện tại của cư dân này' },
        { status: 404 }
      )
    }

    const room = tenantRow.room
    const branchName = room?.branch?.name || 'Chưa phân chi nhánh'
    const roomCode = room?.room_code || 'N/A'
    const contractImages = await getContractImagesById(activeContract.id)
    const cancellationRequest = buildCancellationPayload(
      activeContract as Parameters<typeof buildCancellationPayload>[0]
    )

    const effectiveStartDate = tenantRow.move_in_date || activeContract.start_date

    return NextResponse.json(
      {
        success: true,
        data: {
          contractId: activeContract.id.toString(),
          roomName: roomCode,
          building: branchName,
          status: activeContract.status,
          deposit: Number(activeContract.deposit_amount ?? 0),
          startDate: toVietnamDateKey(effectiveStartDate) ?? effectiveStartDate,
          endDate: activeContract.end_date
            ? toVietnamDateKey(activeContract.end_date)
            : null,
          remainingDays: formatRemainingDays(activeContract.end_date),
          contractImages,
          cancellationRequest,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
