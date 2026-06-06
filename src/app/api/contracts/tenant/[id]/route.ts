import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import { getContractImagesById } from '@/lib/contracts'

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
  contracts?: Array<{
    id: number
    status: string
    deposit_amount: number | null
    start_date: string
    end_date: string | null
  }> | null
}

function formatRemainingDays(endDate: string | null): number {
  if (!endDate) return 0

  const parsed = new Date(endDate)
  if (Number.isNaN(parsed.getTime())) return 0

  const diffMs = parsed.getTime() - Date.now()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
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
        ),
        contracts(
          id,
          status,
          deposit_amount,
          start_date,
          end_date
        )
      `)
      .eq('id', tenantId)
      .single()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng của cư dân này' }, { status: 404 })
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

    const contracts = tenantRow.contracts ?? []
    const activeContract = contracts.find((contract) => contract.status === 'active') ?? contracts[0] ?? null

    if (!activeContract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng hiện tại của cư dân này' }, { status: 404 })
    }

    const room = tenantRow.room
    const branchName = room?.branch?.name || 'Chưa phân chi nhánh'
    const roomCode = room?.room_code || 'N/A'
    const contractImages = await getContractImagesById(activeContract.id)

    return NextResponse.json({
      success: true,
      data: {
        contractId: activeContract.id.toString(),
        roomName: roomCode,
        building: branchName,
        status: activeContract.status,
        deposit: Number(activeContract.deposit_amount ?? 0),
        startDate: activeContract.start_date,
        endDate: activeContract.end_date,
        remainingDays: formatRemainingDays(activeContract.end_date),
        contractImages,
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
