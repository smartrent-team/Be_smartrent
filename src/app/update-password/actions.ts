'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    redirect(`/update-password?message=${encodeURIComponent('Mật khẩu xác nhận không khớp.')}`)
  }

  const supabase = await createClient()

  // Cập nhật mật khẩu cho user hiện tại (đã được xác thực qua PKCE callback trước đó)
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/update-password?message=${encodeURIComponent(error.message)}`)
  }

  // Tuỳ chọn: Có thể sign out user sau khi đổi mật khẩu để họ phải đăng nhập lại
  await supabase.auth.signOut()

  redirect(`/login?message=${encodeURIComponent('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.')}`)
}
