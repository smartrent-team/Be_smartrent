

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import { CreateRoomDialog } from './_components/CreateRoomDialog'
import RoomListClient, { type RoomRow } from './_components/RoomListClient'

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  const status = params.status as string || 'all'

  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()

  // Dùng admin client để bypass RLS
  const adminSupabase = createAdminClient()

  let query = adminSupabase
    .from('rooms')
    .select('*, branch:branches(name), tenants(id, move_out_date, user:users(full_name))')
    .order('room_code', { ascending: true })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const [
    { data: rooms, error },
    { data: rawBranches }
  ] = await Promise.all([
    query,
    adminSupabase
      .from('branches')
      .select('id, name')
      .order('name')
  ])

  const branches = rawBranches || []

  if (error) {
    console.error(error)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="outline" className="text-green-600">Trống</Badge>
      case 'occupied':
        return <Badge variant="default" className="bg-blue-600">Đã thuê</Badge>
      case 'maintenance':
        return <Badge variant="destructive">Bảo trì</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  interface RoomTenant {
    id: number
    move_out_date: string | null
    user?: { full_name: string } | null
  }

  interface RoomData {
    id: number
    room_code: string
    branch?: { name: string } | null
    floor: number | null
    base_price: number
    status: string
    tenants?: RoomTenant[]
  }

  const roomsList = (rooms as unknown as RoomData[]) || []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý phòng</h1>
          <p className="text-muted-foreground mt-2">Xem và quản lý tất cả các phòng trong hệ thống.</p>
        </div>
        
        <CreateRoomDialog branches={branches} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Link 
          href="?status=all" 
          className={buttonVariants({ variant: status === 'all' ? 'default' : 'outline', size: 'sm' })}
        >
          Tất cả
        </Link>
        <Link 
          href="?status=available" 
          className={buttonVariants({ variant: status === 'available' ? 'default' : 'outline', size: 'sm' })}
        >
          Trống
        </Link>
        <Link 
          href="?status=occupied" 
          className={buttonVariants({ variant: status === 'occupied' ? 'default' : 'outline', size: 'sm' })}
        >
          Đã thuê
        </Link>
        <Link 
          href="?status=maintenance" 
          className={buttonVariants({ variant: status === 'maintenance' ? 'default' : 'outline', size: 'sm' })}
        >
          Bảo trì
        </Link>
      </div>
      
      <RoomListClient initialRooms={roomsList as RoomRow[]} />
    </div>
  )
}
