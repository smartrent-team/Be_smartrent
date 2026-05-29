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
import { Edit, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { editManager } from '../actions'

interface Branch {
  id: number
  name: string
}

interface Manager {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  branch_id: number | null
}

export function EditManagerDialog({ manager, branches }: { manager: Manager; branches: Branch[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Định dạng lại +84 thành 0 cho dễ nhập liệu
  const formatDisplayPhone = (p: string | null) => {
    if (!p) return ''
    if (p.startsWith('+84')) return '0' + p.slice(3)
    return p
  }

  const [formData, setFormData] = useState({
    fullName: manager.full_name || '',
    phone: formatDisplayPhone(manager.phone),
    email: manager.email?.includes('@user.local') || manager.email === 'Chưa cập nhật' ? '' : manager.email || '',
    password: '',
    branchId: manager.branch_id?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.phone || !formData.email || !formData.branchId || formData.branchId === 'none') {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc bao gồm chi nhánh')
      return
    }

    setLoading(true)
    try {
      await editManager(manager.id, {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password || undefined,
        branchId: formData.branchId,
      })

      toast.success('Đã cập nhật tài khoản Manager thành công!')
      setFormData((prev) => ({ ...prev, password: '' }))
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
          <Button
            variant="ghost"
            size="icon"
            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 rounded-lg h-9 w-9"
            title="Sửa Manager"
          >
            <Edit className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            Sửa Thông Tin Manager
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Thay đổi thông tin hoặc gán chi nhánh mới cho Manager phụ trách.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-fullName" className="text-sm font-medium text-gray-700">
              Họ và tên <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-fullName"
              placeholder="VD: Nguyễn Văn A"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">
              Số điện thoại <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-phone"
              type="tel"
              placeholder="VD: 0912345678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">
              Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="VD: manager@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
            <p className="text-xs text-amber-600">
              ⚠️ Bắt buộc nhập email thật để Manager có thể lấy lại mật khẩu.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password" className="text-sm font-medium text-gray-700 flex flex-col gap-0.5">
              <span>Đổi mật khẩu mới</span>
              <span className="text-[10px] text-gray-400 font-normal">(Bỏ trống nếu giữ nguyên mật khẩu cũ)</span>
            </Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Nhập ít nhất 6 ký tự để đổi"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-branch" className="text-sm font-medium text-gray-700">
              Chi nhánh phụ trách <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={formData.branchId}
              onValueChange={(val) => setFormData({ ...formData, branchId: val || '' })}
            >
              <SelectTrigger id="edit-branch" className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl">
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
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
