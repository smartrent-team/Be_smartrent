'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicAppUrl } from '@/lib/public-url'

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const origin = await getPublicAppUrl()

  // Web form: redirectTo trỏ về /update-password (web UI)
  // Mobile: dùng /api/auth/forgot-password riêng với redirectTo là deep link
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/update-password?source=web`,
  })

  if (error) {
    redirect(`/forgot-password?message=${encodeURIComponent(error.message)}`)
  }

  redirect(`/forgot-password?success=${encodeURIComponent('Đã gửi email khôi phục. Vui lòng kiểm tra hộp thư của bạn.')}`)
}
