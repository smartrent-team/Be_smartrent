import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLatestEffectiveContract } from '@/lib/contract-selection'
import TenantListClient, { type FormattedTenant } from './_components/TenantListClient'

export default async function TenantsPage() {
  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  // 1. Fetch branches, rooms & tenants in parallel
  const [
    { data: rawBranches },
    { data: rawRooms },
    { data: rawTenants },
  ] = await Promise.all([
    adminSupabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true }),

    adminSupabase
      .from('rooms')
      .select('id, room_code, base_price, status, branch_id')
      .order('room_code', { ascending: true }),

    adminSupabase
      .from('tenants')
      .select(`
        id,
        move_in_date,
        move_out_date,
        room_id,
        user_id,
        room:rooms(
          id,
          room_code,
          branch_id,
          branch:branches(id, name)
        ),
        user:users!inner(
          id,
          full_name,
          email,
          phone,
          status
        ),
        contracts(
          id,
          deposit_amount,
          status,
          start_date,
          end_date
        )
      `)
      .order('created_at', { ascending: false }),
  ])

  const branches = rawBranches || []
  const allRooms = rawRooms || []
  const availableRooms = allRooms.filter((r) => r.status === 'available')

  interface TenantData {
    id: number
    user_id: number
    room_id: number | null
    move_in_date: string | null
    move_out_date: string | null
    room?: {
      id?: number
      room_code?: string
      branch_id?: number | null
      branch?: { id?: number; name?: string } | { id?: number; name?: string }[] | null
    } | {
      id?: number
      room_code?: string
      branch_id?: number | null
      branch?: { id?: number; name?: string } | { id?: number; name?: string }[] | null
    }[] | null
    user?: {
      id?: number
      full_name?: string
      email?: string
      phone?: string
      status?: string | null
    } | {
      id?: number
      full_name?: string
      email?: string
      phone?: string
      status?: string | null
    }[] | null
    contracts?: {
      id?: number | null
      deposit_amount: number | null
      status: string
      start_date?: string | null
      end_date?: string | null
    }[]
  }

  const tenants: FormattedTenant[] = ((rawTenants as unknown as TenantData[]) || []).map((t) => {
    const rawRoom = Array.isArray(t.room) ? t.room[0] : t.room
    const rawUser = Array.isArray(t.user) ? t.user[0] : t.user
    const rawBranch = rawRoom?.branch
      ? Array.isArray(rawRoom.branch)
        ? rawRoom.branch[0]
        : rawRoom.branch
      : null

    const activeContract = getLatestEffectiveContract(t.contracts || [])
    const userStatus = rawUser?.status
    const displayStatus: 'active' | 'locked' =
      userStatus === 'locked' || userStatus === 'blocked' ? 'locked' : 'active'

    return {
      id: t.id,
      userId: t.user_id,
      roomId: t.room_id,
      depositAmount: activeContract?.deposit_amount || 0,
      name: rawUser?.full_name || 'Khách chưa có tên',
      phone: rawUser?.phone || 'Chưa cập nhật',
      email: rawUser?.email || 'Chưa cập nhật',
      room: rawRoom?.room_code || 'Trống',
      branch: rawBranch?.name || 'Chưa phân chi nhánh',
      branchId: rawRoom?.branch_id || rawBranch?.id || null,
      status: displayStatus,
      joinDate: t.move_in_date
        ? new Date(t.move_in_date).toLocaleDateString('vi-VN')
        : 'N/A',
      rawMoveInDate: t.move_in_date,
      rawMoveOutDate: t.move_out_date,
    }
  })

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50/50">
      <TenantListClient
        initialTenants={tenants}
        branches={branches}
        allRooms={allRooms}
        availableRooms={availableRooms}
      />
    </div>
  )
}
