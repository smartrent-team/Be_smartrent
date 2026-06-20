'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const emailOrPhone = formData.get('email') as string
  const password = formData.get('password') as string

  let targetEmail = emailOrPhone
  if (!emailOrPhone.includes('@')) {
    // Nếu nhập số điện thoại, cần tìm email thật trong public.users
    let localPhone = emailOrPhone
    if (emailOrPhone.startsWith('0')) localPhone = `+84${emailOrPhone.slice(1)}`
    else if (!emailOrPhone.startsWith('+')) localPhone = `+84${emailOrPhone}`

    const { data: userRecord } = await supabase.from('users').select('email').eq('phone', localPhone).single()
    if (userRecord && userRecord.email) {
      targetEmail = userRecord.email
    } else {
      // Fallback cho tài khoản cũ
      targetEmail = `${localPhone.replace('+', '')}@user.local`
    }
  }

  const data = {
    email: targetEmail,
    password: password,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
