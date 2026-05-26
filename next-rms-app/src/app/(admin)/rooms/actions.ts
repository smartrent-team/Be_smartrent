'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { roomSchema, formatZodError } from '@/lib/validations'

export async function addRoom(formData: FormData) {
  const supabase = await createClient()

  const data = {
    roomNumber: formData.get('roomNumber'),
    branch: formData.get('branch') || null,
    price: formData.get('price') || 0,
    area: formData.get('area') || 0,
    floor: formData.get('floor') || 1,
  }

  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error))
  }

  const { roomNumber, branch, price, area, floor } = parsed.data

  const { error } = await supabase
    .from('rooms')
    .insert([
      {
        room_number: roomNumber,
        branch_id: branch,
        price: price,
        area: area,
        floor: floor,
        status: 'available'
      }
    ])

  if (error) {
    console.error('Lỗi khi thêm phòng:', error)
    throw new Error(error.message)
  }

  revalidatePath('/rooms')
}
