import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader className="flex flex-col items-center text-center">
          <div className="w-16 h-16 relative mb-2 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
             <Image src="/logo_smart/logo.jpg" alt="SmartRent Logo" fill className="object-cover" />
          </div>
          <CardTitle className="text-xl">Đăng nhập Hệ thống RMS</CardTitle>
          <CardDescription>
            Nhập email và mật khẩu của bạn để truy cập hệ thống quản lý.
          </CardDescription>
        </CardHeader>
        <form action={login}>
          <CardContent className="space-y-4">
            {message && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email hoặc Số điện thoại</Label>
              <Input id="email" name="email" type="text" placeholder="Nhập email hoặc SĐT (VD: 0988...)" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Đăng nhập
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
