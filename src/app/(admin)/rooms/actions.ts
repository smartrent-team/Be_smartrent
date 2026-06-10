'use server'

import { verifySuperAdmin } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'
import { roomSchema, formatZodError } from '@/core/validations'
import { RoomService } from '@/services/room.service'

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

  try {
    await RoomService.addRoom({
      supabase,
      roomNumber,
      branchId: branch,
      price,
      area,
      floor
    })

    revalidatePath('/rooms')
  } catch (error: any) {
    console.error('Lỗi khi thêm phòng:', error)
    throw new Error(error.message || 'Lỗi thêm phòng')
  }
}
