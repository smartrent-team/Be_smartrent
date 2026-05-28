import { updatePassword } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams
  
  // Xác minh người dùng có phiên hợp lệ để đổi mật khẩu không
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?message=Phiên đổi mật khẩu không hợp lệ hoặc đã hết hạn.')
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
        <form action={updatePassword}>
          <CardContent className="space-y-4">
            {message && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu mới</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Cập nhật mật khẩu
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
