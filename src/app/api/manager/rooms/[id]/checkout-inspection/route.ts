import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyRole(['manager', 'super_admin'])
    if (auth.error || !auth.user || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const roomId = Number(params.id)
    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'ID phòng không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const { tenantId, electric_new, water_new, issues } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'Thiếu tenantId' }, { status: 400 })
    }

    const supabase = auth.supabase!

    // 1. Kiểm tra Tenant và Hợp đồng
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, room_id')
      .eq('id', tenantId)
      .eq('room_id', roomId)
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ cư dân trong phòng này' }, { status: 404 })
    }

    const { data: activeContract, error: contractErr } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'pending_checkout'])
      .maybeSingle()
      
    if (contractErr || !activeContract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng đang hoạt động hoặc chờ trả phòng' }, { status: 400 })
    }

    // 2. Kiểm tra xem phòng còn hợp đồng active nào không (ngoại trừ người này)
    const { count, error: countErr } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .in('status', ['active', 'pending_checkout'])
      .neq('id', activeContract.id)

    // Nếu không còn ai ở, chuyển phòng sang 'cleaning'
    if (!countErr && count === 0) {
      await supabase
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', roomId)
    }

    // 3. Tạo báo cáo hư hỏng (Maintenance Tickets)
    if (issues && Array.isArray(issues) && issues.length > 0) {
      const ticketsToInsert = issues.map((issue: any) => ({
        room_id: roomId,
        tenant_id: tenantId,
        title: issue.title || 'Hư hỏng lúc trả phòng',
        description: issue.description || '',
        priority: 'high',
        status: 'pending',
        repair_cost: issue.repair_cost || 0,
        issue_type: 'checkout_damage',
        images: issue.images || [],
        approval_status: 'pending',
        reported_by_id: auth.dbUserId,
      }))

      const { error: insertErr } = await supabase
        .from('maintenance_tickets')
        .insert(ticketsToInsert)

      if (insertErr) {
        console.error('Lỗi khi tạo báo cáo hư hỏng:', insertErr)
        return NextResponse.json({ error: 'Không thể tạo báo cáo hư hỏng' }, { status: 500 })
      }
    }

    // 4. Lưu lại chỉ số điện nước cuối (có thể lưu vào invoice nháp hoặc metadata, ở đây đơn giản là cập nhật hợp đồng hoặc lưu để Admin tạo hóa đơn sau)
    // Tạm thời, ta đổi trạng thái hợp đồng sang `pending_liquidation` để Admin xử lý bước cuối
    await supabase
      .from('contracts')
      .update({ status: 'pending_liquidation' })
      .eq('id', activeContract.id)

    return NextResponse.json({
      success: true,
      message: 'Đã hoàn tất kiểm tra phòng. Hệ thống đang chờ Admin duyệt chi phí.',
    })

  } catch (error: unknown) {
    console.error('Lỗi API checkout-inspection:', error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    )
  }
}
