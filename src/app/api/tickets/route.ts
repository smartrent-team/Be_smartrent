import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { dispatchNotification } from '@/lib/notification_dispatch'
import { ticketSchema, formatZodError } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }
    const supabase = auth.supabase!

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const status = searchParams.get('status')

    const baseSelect = `
      id, title, description, status, images, created_at, priority, repair_cost,
      rooms (id, room_code, floor),
      tenants (id, user:users(full_name, phone))
    `
    const baseSelectInner = `
      id, title, description, status, images, created_at, priority, repair_cost,
      rooms (id, room_code, floor, branch_id),
      tenants (id, user:users(full_name, phone))
    `

    // Phân quyền RBAC
    let query
    if (auth.role === 'tenant') {
      // Lấy room_id của tenant trước, sau đó query tickets
      const { data: tenantInfo } = await supabase
        .from('tenants').select('room_id')
        .eq('user_id', auth.dbUserId).is('move_out_date', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!tenantInfo?.room_id) {
        return NextResponse.json({ success: true, data: [] })
      }
      query = supabase.from('maintenance_tickets').select(baseSelect).eq('room_id', tenantInfo.room_id)
    } else if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Manager không có chi nhánh' }, { status: 403 })
      }
      const { data: branchRooms } = await supabase
        .from('rooms').select('id').eq('branch_id', auth.branchId)
      const branchRoomIds = (branchRooms || []).map((r: { id: number }) => r.id)
      if (branchRoomIds.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
      query = supabase.from('maintenance_tickets').select(baseSelectInner).in('room_id', branchRoomIds)
    } else {
      query = supabase.from('maintenance_tickets').select(baseSelect)
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
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
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
      const { data: tenantInfo } = await supabase.from('tenants').select('id, room_id').eq('user_id', auth.dbUserId).is('move_out_date', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!tenantInfo) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin khách thuê đang thuê phòng' }, { status: 403 })
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

    // Lấy room info
    const { data: room } = await supabase
      .from('rooms').select('room_code, branch_id').eq('id', finalRoomId).single()

    let managerQuery = supabase.from('users').select('id')
    if (room?.branch_id != null) {
      managerQuery = managerQuery.or(`role.eq.super_admin,and(role.eq.manager,branch_id.eq.${room.branch_id})`)
    } else {
      managerQuery = managerQuery.eq('role', 'super_admin')
    }

    // Lấy managers + tenantUser song song
    const [{ data: managers }, tenantUserResult] = await Promise.all([
      managerQuery,
      finalTenantId
        ? supabase.from('tenants').select('user_id').eq('id', finalTenantId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const notificationTitle = 'Có sự cố mới'
    const notificationBody = `Phòng ${room?.room_code ?? 'chưa xác định'}: ${title}`

    // Gửi tất cả notifications song song
    await Promise.all([
      ...(managers ?? []).map(manager =>
        dispatchNotification(supabase, { userId: manager.id }, {
          title: notificationTitle,
          body: notificationBody,
          type: 'ticket',
          data: { ticketId: String(ticket.id), roomId: String(finalRoomId), status: 'pending' },
        })
      ),
      ...(tenantUserResult?.data?.user_id ? [
        dispatchNotification(
          supabase,
          { userId: tenantUserResult.data.user_id, tenantId: finalTenantId },
          {
            title: 'Sự cố đã được tiếp nhận',
            body: `Sự cố "${title}" tại phòng ${room?.room_code ?? finalRoomId} đã được ghi nhận và đang chờ xử lý.`,
            type: 'ticket',
            data: { ticketId: String(ticket.id), roomId: String(finalRoomId), status: 'pending' },
          }
        )
      ] : []),
    ])

    return NextResponse.json({ success: true, data: ticket })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
