import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { ticketSchema, formatZodError } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const supabase = auth.supabase!

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const status = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any;

    // Phân quyền RBAC
    if (auth.role === 'tenant') {
      // Khách thuê chỉ xem được ticket của phòng mình (Lấy room_id từ bảng tenants)
      const { data: tenantInfo } = await supabase.from('tenants').select('room_id').eq('user_id', auth.user.id).single()
      if (!tenantInfo?.room_id) {
        return NextResponse.json({ success: true, data: [] }) // Không có phòng
      }
      query = supabase.from('maintenance_tickets').select(`
        id, title, description, status, images, created_at, priority,
        rooms (id, room_code),
        tenants (id, user:users(full_name, phone))
      `).eq('room_id', tenantInfo.room_id)
    } else if (auth.role === 'manager') {
      // Quản lý chỉ xem được ticket của chi nhánh mình
      if (auth.branchId) {
        // Lưu ý: với inner join của PostgREST, filter trên relation sẽ lọc luôn record chính
        query = supabase.from('maintenance_tickets').select(`
          id, title, description, status, images, created_at, priority,
          rooms!inner (id, room_code, branch_id),
          tenants (id, user:users(full_name, phone))
        `).eq('rooms.branch_id', auth.branchId)
      } else {
        return NextResponse.json({ error: 'Manager không có chi nhánh' }, { status: 403 })
      }
    } else {
      // super_admin: xem được tất cả, không cần filter thêm
      query = supabase.from('maintenance_tickets').select(`
        id, title, description, status, images, created_at, priority,
        rooms (id, room_code),
        tenants (id, user:users(full_name, phone))
      `)
    }

    if (roomId) {
      query = query.eq('room_id', roomId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: tickets, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data: tickets })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const supabase = auth.supabase!

    const body = await request.json()
    
    // Zod Validation
    const parsed = ticketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }
    
    const { roomId, tenantId, title, description, images, priority } = parsed.data

    const { data: ticket, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        room_id: roomId,
        tenant_id: tenantId,
        title,
        description,
        status: 'pending',
        priority: priority || 'medium',
        images: images || []
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: ticket })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
