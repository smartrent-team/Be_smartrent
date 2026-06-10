import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { ticketSchema, formatZodError } from '@/core/validations'

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

    const baseSelect = `
      id, title, description, status, images, created_at, priority,
      rooms (id, room_code, floor),
      tenants (id, user:users(full_name, phone))
    `
    const baseSelectInner = `
      id, title, description, status, images, created_at, priority,
      rooms!inner (id, room_code, floor, branch_id),
      tenants (id, user:users(full_name, phone))
    `

    // Phân quyền RBAC
    let query
    if (auth.role === 'tenant') {
      // Khách thuê chỉ xem được ticket của phòng mình (Lấy room_id từ bảng tenants)
      const { data: tenantInfo } = await supabase.from('tenants').select('room_id').eq('user_id', auth.dbUserId).single()
      if (!tenantInfo?.room_id) {
        return NextResponse.json({ success: true, data: [] }) // Không có phòng
      }
      query = supabase.from('maintenance_tickets').select(baseSelect).eq('room_id', tenantInfo.room_id)
    } else if (auth.role === 'manager') {
      // Quản lý chỉ xem được ticket của chi nhánh mình
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Manager không có chi nhánh' }, { status: 403 })
      }
      query = supabase.from('maintenance_tickets').select(baseSelectInner).eq('rooms.branch_id', auth.branchId)
    } else if (auth.role === 'super_admin') {
      if (!auth.organizationId) {
        return NextResponse.json({ error: 'Tài khoản Super Admin chưa được gán tổ chức' }, { status: 403 })
      }
      
      const { getOrgBranchIds } = await import('@/lib/rbac')
      const branchIds = await getOrgBranchIds(supabase, auth.organizationId)
      if (!branchIds || branchIds.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }

      query = supabase.from('maintenance_tickets').select(baseSelectInner).in('rooms.branch_id', branchIds)
    } else {
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 })
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

    let finalRoomId = roomId;
    let finalTenantId = tenantId;

    if (auth.role === 'tenant') {
      const { data: tenantInfo } = await supabase.from('tenants').select('id, room_id').eq('user_id', auth.dbUserId).single();
      if (!tenantInfo) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin khách thuê' }, { status: 403 })
      }
      finalRoomId = tenantInfo.room_id;
      finalTenantId = tenantInfo.id;
    } else if (auth.role === 'manager') {
      const { data: roomCheck } = await supabase.from('rooms').select('branch_id').eq('id', finalRoomId).single();
      if (!roomCheck || roomCheck.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không thể tạo sự cố cho phòng thuộc chi nhánh khác' }, { status: 403 })
      }
    }

    const { data: ticket, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        room_id: finalRoomId,
        tenant_id: finalTenantId,
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
