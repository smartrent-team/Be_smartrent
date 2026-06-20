'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase gửi token qua URL hash fragment khi user click link trong email
    // Ví dụ: /update-password#access_token=xxx&type=recovery
    // Hoặc đã được xử lý bởi callback (PKCE) → user đã có session sẵn
    const handleHashToken = async () => {
      const hash = window.location.hash

      if (hash && hash.includes('access_token')) {
        // Lấy token từ hash fragment
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token') ?? ''
        const type = params.get('type')

        if (type === 'recovery' && accessToken) {
          // Thiết lập session với token từ email
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            setMessage({ type: 'error', text: 'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.' })
            return
          }

          // Xóa hash khỏi URL cho gọn
          window.history.replaceState(null, '', window.location.pathname)
          setSessionReady(true)
          return
        }
      }

      // Cách 1: Xử lý token hash trực tiếp từ URL (dành cho Email Template dùng token_hash)
      const searchParams = new URLSearchParams(window.location.search)
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      
      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        
        if (error) {
          setMessage({ type: 'error', text: 'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.' })
          return
        }
        
        // Xóa token_hash khỏi URL để bảo mật
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('token_hash')
        newUrl.searchParams.delete('type')
        window.history.replaceState(null, '', newUrl.toString())
        
        setSessionReady(true)
        return
      }

      // Cách 2: Không có hash → kiểm tra session hiện tại (đến từ PKCE callback)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setSessionReady(true)
      } else {
        setMessage({ type: 'error', text: 'Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email khôi phục.' })
      }
    }

    handleHashToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' })
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' })
      return
    }

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
      return
    }

    // Đăng xuất để buộc đăng nhập lại với mật khẩu mới
    await supabase.auth.signOut()

    setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' })
    setLoading(false)

    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search)
      const source = urlParams.get('source')

      if (source === 'mobile_app') {
        window.location.href = 'smartrent://open?page=login'
      } else {
        router.push('/login?message=' + encodeURIComponent('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'))
      }
    }, 1500)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Cập nhật mật khẩu mới</CardTitle>
          <CardDescription>
            Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {message && (
              <div
                className={`p-3 text-sm rounded-md ${
                  message.type === 'error'
                    ? 'text-red-500 bg-red-50'
                    : 'text-green-700 bg-green-50'
                }`}
              >
                {message.text}
              </div>
            )}

            {!sessionReady && !message && (
              <div className="p-3 text-sm text-gray-500 bg-gray-50 rounded-md">
                Đang xác thực đường dẫn...
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu mới</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!sessionReady || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!sessionReady || loading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!sessionReady || loading}
            >
              {loading ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
