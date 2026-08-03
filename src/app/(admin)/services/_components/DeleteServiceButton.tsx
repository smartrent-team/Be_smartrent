'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteService } from '../actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function DeleteServiceButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteService(id)
      toast.success(`Đã xóa dịch vụ "${name}" thành công!`)
      setOpen(false)
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Không thể xóa dịch vụ'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50/50 rounded-lg h-9 w-9"
        title="Xóa dịch vụ"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-800">
              Xác Nhận Xóa Dịch Vụ
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-2">
              Bạn có chắc chắn muốn xóa dịch vụ{' '}
              <span className="font-semibold text-rose-600">&ldquo;{name}&rdquo;</span> không?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

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
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                'Xóa dịch vụ'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
