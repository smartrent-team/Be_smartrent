import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

// PATCH /api/rooms/fixtures/[id]
// ONLY super admin can edit a fixture
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Chỉ có Super Admin mới có quyền chỉnh sửa đồ cố định' }, { status: 403 })
    }

    const { id } = await params
    const supabase = auth.supabase!
    const body = await request.json()
    const { name, quantity, status, description } = body

    // Check if the fixture exists
    const { data: fixtureCheck, error: fixtureCheckError } = await supabase
      .from('room_fixtures')
      .select('id')
      .eq('id', Number(id))
      .single()

    if (fixtureCheckError || !fixtureCheck) {
      return NextResponse.json({ error: 'Không tìm thấy đồ cố định được yêu cầu' }, { status: 404 })
    }

    // Build update payload
    const updatePayload: Record<string, any> = {}
    if (name !== undefined) updatePayload.name = name.trim()
    if (quantity !== undefined) updatePayload.quantity = Number(quantity)
    if (status !== undefined) updatePayload.status = status
    if (description !== undefined) updatePayload.description = description || null

    const { data: updatedFixture, error: updateError } = await supabase
      .from('room_fixtures')
      .update(updatePayload)
      .eq('id', Number(id))
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật đồ cố định thành công',
      data: updatedFixture
    })
  } catch (error: unknown) {
    console.error('Error updating room fixture:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE /api/rooms/fixtures/[id]
// ONLY super admin can delete a fixture
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Chỉ có Super Admin mới có quyền xóa đồ cố định' }, { status: 403 })
    }

    const { id } = await params
    const supabase = auth.supabase!

    // Check if the fixture exists
    const { data: fixtureCheck, error: fixtureCheckError } = await supabase
      .from('room_fixtures')
      .select('id')
      .eq('id', Number(id))
      .single()

    if (fixtureCheckError || !fixtureCheck) {
      return NextResponse.json({ error: 'Không tìm thấy đồ cố định được yêu cầu' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('room_fixtures')
      .delete()
      .eq('id', Number(id))

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Xóa đồ cố định thành công'
    })
  } catch (error: unknown) {
    console.error('Error deleting room fixture:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
