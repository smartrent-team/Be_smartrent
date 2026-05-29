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
import { Edit, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { editTenantAction } from '../actions'

interface Room {
  id: number
  room_code: string
  base_price: number
  status: string
}

interface Tenant {
  id: number
  userId: number
  roomId: number | null
  depositAmount: number | null
  name: string
  phone: string
  email: string
  status: string
  rawMoveInDate: string
  rawMoveOutDate: string | null
}

export function EditTenantDialog({ tenant, rooms }: { tenant: Tenant; rooms: Room[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const formatDisplayPhone = (p: string) => {
    if (p.startsWith('+84')) return '0' + p.slice(3)
    return p
  }

  const [formData, setFormData] = useState({
    fullName: tenant.name,
    phone: formatDisplayPhone(tenant.phone),
    email: tenant.email.includes('@user.local') || tenant.email === 'Chưa cập nhật' ? '' : tenant.email,
    password: '',
    roomId: tenant.roomId?.toString() || '',
    depositAmount: tenant.depositAmount?.toString() || '0',
    moveInDate: tenant.rawMoveInDate ? tenant.rawMoveInDate.split('T')[0] : '',
    moveOutDate: tenant.rawMoveOutDate ? tenant.rawMoveOutDate.split('T')[0] : '',
  })

  // Hiển thị phòng hiện tại + các phòng trống khả dụng để đổi phòng
  const availableAndCurrentRooms = rooms.filter(
    (r) => r.status === 'available' || r.id === tenant.roomId
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.phone || !formData.email || !formData.roomId || !formData.moveInDate) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc')
      return
    }

    setLoading(true)
    try {
      await editTenantAction(tenant.id, tenant.userId, {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password || undefined,
        roomId: formData.roomId,
        depositAmount: parseInt(formData.depositAmount, 10) || 0,
        moveInDate: formData.moveInDate,
        moveOutDate: formData.moveOutDate || undefined,
      })

      toast.success('Đã cập nhật thông tin khách thuê thành công!')
      setFormData((prev) => ({ ...prev, password: '' }))
      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Không thể cập nhật thông tin'
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
            title="Sửa thông tin khách thuê"
          >
            <Edit className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            Sửa Hồ Sơ Khách Thuê
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Cập nhật thông tin tài khoản, phòng ở hoặc cấu hình trả phòng.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-tenant-fullName" className="text-sm font-medium text-gray-700">
              Họ và tên <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-tenant-fullName"
              placeholder="VD: Nguyễn Văn A"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tenant-phone" className="text-sm font-medium text-gray-700">
                Số điện thoại <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-tenant-phone"
                type="tel"
                placeholder="VD: 0912345678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-tenant-email" className="text-sm font-medium text-gray-700">
                Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-tenant-email"
                type="email"
                placeholder="VD: nguyenvana@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                required
              />
              <p className="text-xs text-amber-600">
                ⚠️ Bắt buộc nhập email thật để khách thuê có thể lấy lại mật khẩu.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tenant-password" className="text-sm font-medium text-gray-700 flex flex-col gap-0.5">
                <span>Đổi mật khẩu</span>
              </Label>
              <Input
                id="edit-tenant-password"
                type="password"
                placeholder="Nhập để đặt lại mật khẩu"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tenant-room" className="text-sm font-medium text-gray-700">
              Chọn phòng thuê <span className="text-rose-500">*</span>
            </Label>
            <select
              id="edit-tenant-room"
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 focus:border-teal-500 focus:ring-teal-500 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">-- Chọn phòng --</option>
              {availableAndCurrentRooms.map((r) => (
                <option key={r.id} value={r.id.toString()}>
                  Phòng {r.room_code} ({r.base_price.toLocaleString('vi-VN')} đ/tháng) {r.id === tenant.roomId ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tenant-deposit" className="text-sm font-medium text-gray-700">
              Tiền đặt cọc (VND)
            </Label>
            <Input
              id="edit-tenant-deposit"
              type="number"
              placeholder="VD: 3000000"
              value={formData.depositAmount}
              onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tenant-moveIn" className="text-sm font-medium text-gray-700">
                Ngày dời vào <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-tenant-moveIn"
                type="date"
                value={formData.moveInDate}
                onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tenant-moveOut" className="text-sm font-medium text-gray-700 flex flex-col gap-0.5">
                <span>Ngày dời ra (Trả phòng)</span>
              </Label>
              <Input
                id="edit-tenant-moveOut"
                type="date"
                value={formData.moveOutDate}
                onChange={(e) => setFormData({ ...formData, moveOutDate: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
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
