import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

// GET /api/rooms/fixtures?room_id=...
// Anyone logged in can read the room fixtures list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('room_id')

    if (!roomId) {
      return NextResponse.json({ error: 'Thiếu ID phòng (parameter room_id)' }, { status: 400 })
    }

    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!

    const { data: fixtures, error } = await supabase
      .from('room_fixtures')
      .select('*')
      .eq('room_id', Number(roomId))
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: fixtures
    })
  } catch (error: unknown) {
    console.error('Error fetching room fixtures:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/rooms/fixtures
// ONLY super admin can add a new fixture
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Chỉ có Super Admin mới có quyền thêm đồ cố định' }, { status: 403 })
    }

    const supabase = auth.supabase!
    const body = await request.json()
    const { room_id, name, quantity, status, description } = body

    if (!room_id || !name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (room_id, name)' }, { status: 400 })
    }

    // Check if the room exists
    const { data: roomCheck, error: roomCheckError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', Number(room_id))
      .single()

    if (roomCheckError || !roomCheck) {
      return NextResponse.json({ error: 'Không tìm thấy phòng tương ứng' }, { status: 404 })
    }

    const { data: newFixture, error: insertError } = await supabase
      .from('room_fixtures')
      .insert({
        room_id: Number(room_id),
        name: name.trim(),
        quantity: typeof quantity === 'number' ? quantity : 1,
        status: status || 'good',
        description: description || null
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: 'Thêm đồ cố định thành công',
      data: newFixture
    })
  } catch (error: unknown) {
    console.error('Error adding room fixture:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
