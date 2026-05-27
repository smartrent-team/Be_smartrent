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
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { addRoom } from '../actions'

interface Branch {
  id: number
  name: string
}

export function CreateRoomDialog({ branches }: { branches: Branch[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    roomNumber: '',
    branchId: '',
    floor: '1',
    price: '',
    area: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.roomNumber || !formData.branchId || !formData.price) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc')
      return
    }

    setLoading(true)
    try {
      await addRoom({
        roomNumber: formData.roomNumber.trim(),
        branch: parseInt(formData.branchId, 10),
        price: parseInt(formData.price, 10),
        floor: formData.floor ? parseInt(formData.floor, 10) : 1,
        area: formData.area ? parseInt(formData.area, 10) : undefined,
      })

      toast.success('Đã thêm phòng mới thành công!')
      setFormData({
        roomNumber: '',
        branchId: '',
        floor: '1',
        price: '',
        area: '',
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
            <Plus className="h-4 w-4" />
            Thêm phòng mới
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            Thêm Phòng Mới
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Nhập thông tin chi tiết để tạo phòng mới trong hệ thống.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="room-roomNumber" className="text-sm font-medium text-gray-700">
              Số phòng / Tên phòng <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="room-roomNumber"
              placeholder="VD: 101, 202A..."
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-branch" className="text-sm font-medium text-gray-700">
              Chi nhánh <span className="text-rose-500">*</span>
            </Label>
            <select
              id="room-branch"
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 focus:border-teal-500 focus:ring-teal-500 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">-- Chọn chi nhánh --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id.toString()}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="room-floor" className="text-sm font-medium text-gray-700">
                Tầng
              </Label>
              <Input
                id="room-floor"
                type="number"
                placeholder="1"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-area" className="text-sm font-medium text-gray-700">
                Diện tích (m²)
              </Label>
              <Input
                id="room-area"
                type="number"
                placeholder="VD: 25"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-price" className="text-sm font-medium text-gray-700">
              Giá thuê (VND) <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="room-price"
              type="number"
              placeholder="VD: 3500000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
              min={0}
            />
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
                'Lưu thông tin'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
