import { NextRequest, NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

/**
 * GET /api/contracts/expiring?days=30
 *
 * Trả về danh sách hợp đồng active sắp hết hạn trong `days` ngày tới.
 * Không phụ thuộc cron job hay notification table.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json(
        { error: auth.error || 'Chưa xác thực' },
        { status: auth.status || 401 }
      )
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 90)

    const supabase = auth.supabase!

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const future = new Date(today)
    future.setDate(future.getDate() + days)

    // Dùng date-only string để tránh lỗi timezone khi end_date lưu dạng DATE
    const todayStr = today.toISOString().split('T')[0]
    const futureStr = future.toISOString().split('T')[0]

    let query = supabase
      .from('contracts')
      .select(`
        id,
        contract_code,
        end_date,
        tenant_id,
        tenant:tenants(
          id,
          user:users(id, full_name, phone)
        ),
        room:rooms(room_code, branch_id)
      `)
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .gte('end_date', todayStr)
      .lte('end_date', futureStr)
      .order('end_date', { ascending: true })

    // Manager chỉ thấy phòng của chi nhánh mình
    if (auth.role === 'manager' && auth.branchId) {
      query = query.eq('rooms.branch_id', auth.branchId)
    }

    const { data: contracts, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Lỗi truy vấn hợp đồng', details: error.message },
        { status: 500 }
      )
    }

    interface ContractRow {
      id: number
      contract_code: string | null
      end_date: string
      tenant_id: number | null
      tenant: { id: number; user: { id: string; full_name: string | null; phone: string | null } | null } | { id: number; user: { id: string; full_name: string | null; phone: string | null } | null }[] | null
      room: { room_code: string | null; branch_id: number | null } | { room_code: string | null; branch_id: number | null }[] | null
    }

    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)

    const result = ((contracts ?? []) as unknown as ContractRow[])
      .map((c) => {
        const tenant = Array.isArray(c.tenant) ? c.tenant[0] : c.tenant
        const room = Array.isArray(c.room) ? c.room[0] : c.room

        // Bỏ qua nếu không có phòng (bị filter branch_id)
        if (!room) return null

        const endDate = new Date(c.end_date)
        endDate.setHours(0, 0, 0, 0)
        const remainingDays = Math.ceil(
          (endDate.getTime() - today0.getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          contractId: c.contract_code ?? `HD${c.id}`,
          contractDbId: c.id,
          tenantId: c.tenant_id,
          userId: tenant?.user?.id ?? null,
          tenantName: tenant?.user?.full_name ?? 'Khách',
          tenantPhone: tenant?.user?.phone ?? '',
          roomCode: room.room_code ?? '—',
          endDate: c.end_date,
          remainingDays,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[contracts/expiring]', msg)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: msg },
      { status: 500 }
    )
  }
}
