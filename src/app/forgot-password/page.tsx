import { resetPassword } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; success?: string }>
}) {
  const { message, success } = await searchParams

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Khôi phục mật khẩu</CardTitle>
          <CardDescription>
            Nhập email của bạn và chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
          </CardDescription>
        </CardHeader>
        <form action={resetPassword}>
          <CardContent className="space-y-4">
            {message && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {message}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">
                {success}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="name@example.com" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full">
              Gửi email khôi phục
            </Button>
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              Quay lại Đăng nhập
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
