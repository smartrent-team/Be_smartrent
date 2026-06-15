import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'tenant') {
      return NextResponse.json({ error: 'API chỉ dành cho cư dân' }, { status: 403 })
    }

    const supabase = auth.supabase!

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, room_id')
      .eq('user_id', auth.dbUserId)
      .is('move_out_date', null)
      .maybeSingle()

    if (tenantError) throw tenantError
    if (!tenant) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ cư dân' }, { status: 404 })
    }

    let roomId = tenant.room_id

    if (!roomId) {
      const { data: activeContract } = await supabase
        .from('contracts')
        .select('room_id')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      roomId = activeContract?.room_id ?? null
    }

    if (!roomId) {
      return NextResponse.json({ error: 'Cư dân chưa được gán phòng' }, { status: 404 })
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        id,
        room_code,
        base_price,
        area,
        status,
        images,
        branch:branches (
          name,
          address
        ),
        tenants (
          id,
          move_out_date
        ),
        room_fixtures (
          id,
          name,
          quantity,
          status,
          description
        )
      `)
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin phòng' }, { status: 404 })
    }

    const branch = Array.isArray(room.branch) ? room.branch[0] : room.branch
    const tenants = (room.tenants ?? []) as Array<{ id: number; move_out_date: string | null }>
    const currentOccupants = tenants.filter((t) => !t.move_out_date).length
    const fixtures = (room.room_fixtures ?? []) as Array<{
      id: number
      name: string
      quantity: number
      status: string
      description: string | null
    }>

    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.room_code,
          code: room.room_code,
          price: room.base_price,
          area: room.area,
          status: room.status,
          maxOccupants: Math.max(currentOccupants, 1),
          currentOccupants,
          amenities: fixtures.map((fixture) => ({
            id: fixture.id,
            name: fixture.name,
            quantity: fixture.quantity,
            status: fixture.status,
            description: fixture.description,
          })),
          images: room.images ?? [],
          address: branch?.address ?? '',
          buildingName: branch?.name ?? '',
        },
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
