'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { roomSchema, formatZodError } from '@/lib/validations'

import { SupabaseClient } from '@supabase/supabase-js'

async function verifySuperAdmin(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Chưa đăng nhập')
  
  let query = supabase.from('users').select('role')
  if (user.email && user.phone) {
    query = query.or(`email.eq.${user.email},phone.eq.${user.phone}`)
  } else if (user.email) {
    query = query.eq('email', user.email)
  } else if (user.phone) {
    query = query.eq('phone', user.phone)
  }

  const { data: profile } = await query.single()
  if (profile?.role !== 'super_admin') {
    throw new Error('Bạn không có quyền thực hiện hành động này (Yêu cầu Super Admin)')
  }
}

export async function addRoom(data: {
  roomNumber: string
  branch: number
  price: number
  area?: number
  floor?: number
}) {
  const supabase = await createClient()
  await verifySuperAdmin(supabase)

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
