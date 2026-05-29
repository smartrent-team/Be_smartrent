'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Branch {
  id: number
  name: string
}

export function CreateManagerDialog({ branches }: { branches: Branch[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    branchId: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.phone || !formData.email || !formData.password || !formData.branchId || formData.branchId === 'none') {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc bao gồm chi nhánh')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          role: 'manager',
          branch_id: formData.branchId ? parseInt(formData.branchId, 10) : null,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Có lỗi xảy ra khi tạo tài khoản')
      }

      toast.success('Đã tạo tài khoản Manager thành công!')
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        branchId: '',
      })
      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-md transition-all duration-200 gap-2">
            <UserPlus className="h-4 w-4" />
            Thêm Manager
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            Tạo Tài Khoản Manager
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Manager mới sẽ phụ trách quản lý chi nhánh được chỉ định và đăng nhập bằng số điện thoại.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
              Họ và tên <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="VD: Nguyễn Văn A"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Số điện thoại <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="VD: 0912345678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="VD: manager@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Mật khẩu <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Nhập ít nhất 6 ký tự"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch" className="text-sm font-medium text-gray-700">
              Chi nhánh phụ trách <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={formData.branchId}
              onValueChange={(val) => setFormData({ ...formData, branchId: val || '' })}
            >
              <SelectTrigger id="branch" className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl">
                <SelectValue placeholder="Chọn chi nhánh phụ trách" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-xl bg-white">
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="rounded-xl hover:bg-gray-100 text-gray-500"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl shadow-md font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
