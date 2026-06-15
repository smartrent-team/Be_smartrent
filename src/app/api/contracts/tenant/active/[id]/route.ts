import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

interface RoomData {
  room_code: string
  floor: number
  branch_id: number | null
}

interface TenantData {
  user_id: string
}

interface ContractRow {
  id: number
  contract_code: string | null
  status: string
  deposit_amount: number | null
  start_date: string
  end_date: string | null
  contract_images: string[] | null
  room: RoomData | null
  tenant: TenantData | null
}

function formatDateOnly(isoDate: string): string {
  return isoDate.split('T')[0]
}

function computeRemainingDays(endDate: string | null): number {
  if (!endDate) return 0
  const end = new Date(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  const diffMs = end.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const parsedTenantId = parseInt(id, 10)
    if (Number.isNaN(parsedTenantId) || parsedTenantId <= 0) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const supabase = auth.supabase!

    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_code,
        status,
        deposit_amount,
        start_date,
        end_date,
        contract_images,
        room:rooms (
          room_code,
          floor,
          branch_id
        ),
        tenant:tenants (
          user_id
        )
      `)
      .eq('tenant_id', parsedTenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng đang hiệu lực' }, { status: 404 })
    }

    const row = contract as unknown as ContractRow

    if (auth.role === 'tenant') {
      if (row.tenant?.user_id !== auth.dbUserId) {
        return NextResponse.json(
          { error: 'Bạn không có quyền xem hợp đồng này' },
          { status: 403 }
        )
      }
    }

    if (auth.role === 'manager') {
      const branchId = row.room?.branch_id
      if (branchId != null && branchId !== auth.branchId) {
        return NextResponse.json(
          { error: 'Bạn không có quyền xem hợp đồng chi nhánh khác' },
          { status: 403 }
        )
      }
    }

    const room = row.room
    const endDate = row.end_date ? formatDateOnly(row.end_date) : null
    const startDate = formatDateOnly(row.start_date)

    const responseData = {
      contractId: row.contract_code ?? `HD${row.id}`,
      roomName: room?.room_code ?? '—',
      building: room?.floor != null ? `Tầng ${room.floor}` : '—',
      status: row.status,
      deposit: row.deposit_amount ?? 0,
      startDate,
      endDate,
      remainingDays: computeRemainingDays(row.end_date),
      contractImages: row.contract_images ?? [],
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
