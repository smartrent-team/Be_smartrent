'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const headersList = await headers()
  
  // Lấy origin từ host (ví dụ: localhost:3000 hoặc domain thật)
  const host = headersList.get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?next=/update-password`,
  })

  if (error) {
    redirect(`/forgot-password?message=${encodeURIComponent(error.message)}`)
  }

  redirect(`/forgot-password?success=${encodeURIComponent('Đã gửi email khôi phục. Vui lòng kiểm tra hộp thư của bạn.')}`)
}
