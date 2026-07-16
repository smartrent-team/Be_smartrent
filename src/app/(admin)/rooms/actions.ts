'use server'

import { verifySuperAdmin } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'
import { roomSchema, formatZodError } from '@/lib/validations'

export async function addRoom(data: {
  roomNumber: string
  branch: number
  price: number
  area?: number
  floor?: number
}) {
  const supabase = await verifySuperAdmin()

  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error))
  }

  const { roomNumber, branch, price, area, floor } = parsed.data

  const { error } = await supabase
    .from('rooms')
    .insert([
      {
        room_code: roomNumber,
        branch_id: branch,
        base_price: price,
        area: area || null,
        floor: floor || null,
        status: 'available'
      }
    ])

  if (error) {
    console.error('Lỗi khi thêm phòng:', error)
    throw new Error(error.message)
  }

  revalidatePath('/rooms')
}

export async function updateRoom(
  id: number,
  data: {
    roomNumber: string
    branch: number
    price: number
    area?: number
    floor?: number
    status?: 'available' | 'occupied' | 'maintenance'
  }
) {
  const supabase = await verifySuperAdmin()

  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error))
  }

  const { roomNumber, branch, price, area, floor } = parsed.data

  const { error } = await supabase
    .from('rooms')
    .update({
      room_code: roomNumber,
      branch_id: branch,
      base_price: price,
      area: area || null,
      floor: floor || null,
      status: data.status || 'available',
    })
    .eq('id', id)

  if (error) {
    console.error('Lỗi khi cập nhật phòng:', error)
    throw new Error(error.message)
  }

  revalidatePath('/rooms')
  revalidatePath(`/rooms/${id}`)
}

