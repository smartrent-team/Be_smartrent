'use client'

import { useState } from 'react'
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
import { PlusCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { addBranch } from '../actions'

export function CreateBranchDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      await addBranch(formData)
      toast.success('Đã thêm chi nhánh mới thành công!')
      setOpen(false)
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Không thể tạo chi nhánh'
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
            <PlusCircle className="h-4 w-4" />
            Thêm chi nhánh
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            Thêm Chi Nhánh Mới
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Nhập thông tin chi nhánh mới để đưa vào hệ thống quản lý phòng trọ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Tên chi nhánh <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="VD: Chi nhánh Quận 7"
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-gray-700">
              Địa chỉ chi nhánh
            </Label>
            <Input
              id="address"
              name="address"
              placeholder="VD: 123 Nguyễn Thị Thập, Tân Phong, Q7"
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Số điện thoại liên hệ
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="VD: 028 1234 5678"
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Mô tả ngắn
            </Label>
            <Input
              id="description"
              name="description"
              placeholder="VD: Khu vực nhà trọ cao cấp, 5 tầng..."
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
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
                'Thêm chi nhánh'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
