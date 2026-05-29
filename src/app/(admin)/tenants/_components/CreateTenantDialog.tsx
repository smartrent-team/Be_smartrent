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
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createTenantAction } from '../actions'

interface Room {
  id: number
  room_code: string
  base_price: number
}

export function CreateTenantDialog({ rooms }: { rooms: Room[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    roomId: '',
    depositAmount: '',
    moveInDate: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.phone || !formData.email || !formData.roomId || !formData.moveInDate) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc')
      return
    }

    setLoading(true)
    try {
      await createTenantAction({
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password || undefined,
        roomId: formData.roomId,
        depositAmount: formData.depositAmount ? parseInt(formData.depositAmount, 10) : 0,
        moveInDate: formData.moveInDate,
      })

      toast.success('Đã thêm khách thuê mới thành công!')
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        roomId: '',
        depositAmount: '',
        moveInDate: new Date().toISOString().split('T')[0],
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
            Thêm khách mới
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            Thêm Khách Thuê Mới
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Tạo tài khoản và gán phòng thuê mới cho khách hàng.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-fullName" className="text-sm font-medium text-gray-700">
              Họ và tên khách thuê <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="tenant-fullName"
              placeholder="VD: Nguyễn Văn A"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-email" className="text-sm font-medium text-gray-700">
              Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="tenant-email"
              type="email"
              placeholder="VD: nguyenvana@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-phone" className="text-sm font-medium text-gray-700">
                Số điện thoại <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="tenant-phone"
                type="tel"
                placeholder="VD: 0912345678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-password" className="text-sm font-medium text-gray-700 flex flex-col gap-0.5">
                <span>Mật khẩu</span>
              </Label>
              <Input
                id="tenant-password"
                type="password"
                placeholder="Mặc định: 123456"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-room" className="text-sm font-medium text-gray-700">
              Chọn phòng thuê <span className="text-rose-500">*</span>
            </Label>
            <select
              id="tenant-room"
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 focus:border-teal-500 focus:ring-teal-500 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">-- Chọn phòng trống --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id.toString()}>
                  Phòng {r.room_code} ({r.base_price.toLocaleString('vi-VN')} đ/tháng)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-deposit" className="text-sm font-medium text-gray-700">
                Tiền đặt cọc (VND)
              </Label>
              <Input
                id="tenant-deposit"
                type="number"
                placeholder="VD: 3000000"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-moveIn" className="text-sm font-medium text-gray-700">
                Ngày dời vào <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="tenant-moveIn"
                type="date"
                value={formData.moveInDate}
                onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                required
              />
            </div>
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
                  Đang thêm...
                </>
              ) : (
                'Thêm khách mới'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
