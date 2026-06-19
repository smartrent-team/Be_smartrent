'use server'

import { verifySuperAdmin } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'

export async function addRoomFixture(data: {
  roomId: number
  name: string
  quantity: number
  status: string
  description?: string
}) {
  const supabase = await verifySuperAdmin()

  if (!data.roomId || !data.name) {
    throw new Error('Thiếu thông tin bắt buộc (roomId, name)')
  }

  const { error } = await supabase
    .from('room_fixtures')
    .insert([
      {
        room_id: data.roomId,
        name: data.name.trim(),
        quantity: data.quantity || 1,
        status: data.status || 'good',
        description: data.description || null
      }
    ])

  if (error) {
    console.error('Lỗi khi thêm đồ cố định:', error)
    throw new Error(error.message)
  }

  revalidatePath(`/rooms/${data.roomId}`)
}

export async function updateRoomFixture(
  fixtureId: number,
  roomId: number,
  data: {
    name?: string
    quantity?: number
    status?: string
    description?: string
  }
) {
  const supabase = await verifySuperAdmin()

  const updatePayload: Record<string, any> = {}
  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.quantity !== undefined) updatePayload.quantity = data.quantity
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.description !== undefined) updatePayload.description = data.description || null

  const { error } = await supabase
    .from('room_fixtures')
    .update(updatePayload)
    .eq('id', fixtureId)

  if (error) {
    console.error('Lỗi khi cập nhật đồ cố định:', error)
    throw new Error(error.message)
  }

  revalidatePath(`/rooms/${roomId}`)
}

export async function deleteRoomFixture(fixtureId: number, roomId: number) {
  const supabase = await verifySuperAdmin()

  const { error } = await supabase
    .from('room_fixtures')
    .delete()
    .eq('id', fixtureId)

  if (error) {
    console.error('Lỗi khi xóa đồ cố định:', error)
    throw new Error(error.message)
  }

  revalidatePath(`/rooms/${roomId}`)
}
