'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName')
    const email = formData.get('email')
    const password = formData.get('password')
    const orgName = formData.get('orgName')
    const phone = formData.get('phone')

    try {
      const res = await fetch('/api/auth/register-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, orgName, phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi đăng ký')
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
      setErrorMsg(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 selection:bg-indigo-500/30 overflow-hidden relative p-4">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6 group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 group-hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              SmartRent
            </span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Tạo tài khoản tổ chức</h1>
          <p className="text-slate-400">Trở thành Super Admin hệ thống nhà trọ của bạn</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl shadow-black/50">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Đăng ký thành công!</h2>
              <p className="text-slate-400">Tổ chức của bạn đã được khởi tạo. Đang chuyển hướng đến trang đăng nhập...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="orgName" className="text-slate-300">Tên tổ chức / Nhà trọ</Label>
                  <Input 
                    id="orgName" 
                    name="orgName" 
                    placeholder="VD: Chuỗi trọ Smart House" 
                    required 
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-slate-300">Họ và tên Admin</Label>
                  <Input 
                    id="fullName" 
                    name="fullName" 
                    placeholder="VD: Nguyễn Văn A" 
                    required 
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-slate-300">Số điện thoại</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel"
                    placeholder="VD: 0987654321" 
                    required 
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-300">Email đăng nhập</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="admin@smarthouse.vn" 
                    required 
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-300">Mật khẩu</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    minLength={6}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-12 mt-6 rounded-xl font-medium bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/25 group"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Hoàn tất đăng ký
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  )
}
