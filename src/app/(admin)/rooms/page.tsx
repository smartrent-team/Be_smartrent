import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreateRoomDialog } from './_components/CreateRoomDialog'
import RoomListClient, { type RoomRow } from './_components/RoomListClient'

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const status = (params.status as string) || 'all'

  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  // Fetch all rooms & branches in parallel
  const [
    { data: rooms, error },
    { data: rawBranches }
  ] = await Promise.all([
    adminSupabase
      .from('rooms')
      .select('*, branch:branches(id, name), tenants(id, move_out_date, user:users(full_name, status))')
      .order('room_code', { ascending: true }),
    adminSupabase
      .from('branches')
      .select('id, name')
      .order('name')
  ])

  const branches = rawBranches || []

  if (error) {
    console.error('Lỗi tải danh sách phòng:', error)
  }

  interface RoomTenant {
    id: number
    move_out_date: string | null
    user?: { full_name: string; status?: string | null } | null
  }

  interface RoomData {
    id: number
    room_code: string
    branch_id?: number | null
    branch?: { id?: number; name: string } | null
    floor: number | null
    base_price: number
    status: string
    tenants?: RoomTenant[]
  }

  const roomsList = (rooms as unknown as RoomData[]) || []

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Quản lý Phòng
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Xem và quản lý cấu hình tất cả các phòng trong toàn bộ hệ thống chi nhánh.
          </p>
        </div>
        
        <CreateRoomDialog branches={branches} />
      </div>

      {/* Main Room List with Advanced Client Filter & Realtime */}
      <RoomListClient
        initialRooms={roomsList as RoomRow[]}
        branches={branches}
        initialStatus={status}
      />
    </div>
  )
}
