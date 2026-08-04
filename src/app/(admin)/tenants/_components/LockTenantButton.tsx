'use client'

import { useState, useTransition } from 'react'
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
import { Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { lockTenantUserAction } from '../actions'

const REASON_OPTIONS = [
  'Hết hạn hợp đồng',
  'Trả phòng trước hạn (Mất cọc)',
  'Vi phạm quy định tòa nhà',
  'Lý do cá nhân / Khác',
]

export function LockTenantButton({
  userId,
  tenantName,
}: {
  userId: string | number
  tenantName: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASON_OPTIONS[0])
  const [customReason, setCustomReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleLock = () => {
    const finalReason = reason === 'Lý do cá nhân / Khác' && customReason.trim()
      ? customReason.trim()
      : reason

    startTransition(async () => {
      try {
        await lockTenantUserAction(String(userId), finalReason, true)
        toast.success(`Đã khóa tài khoản của ${tenantName} thành công.`)
        setOpen(false)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`Khóa tài khoản thất bại: ${msg}`)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            title="Khóa tài khoản"
          >
            <Lock className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Lock className="h-5 w-5" /> Khóa tài khoản cư dân
          </DialogTitle>
          <DialogDescription>
            Khóa tài khoản <span className="font-semibold text-slate-900">{tenantName}</span>. Cư dân sẽ không thể đăng nhập hoặc thực hiện thao tác trên ứng dụng Mobile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <label className="text-sm font-semibold text-slate-700">Chọn lý do khóa tài khoản:</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 border rounded-lg text-sm bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {REASON_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {reason === 'Lý do cá nhân / Khác' && (
            <input
              type="text"
              placeholder="Nhập chi tiết lý do..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button variant="destructive" onClick={handleLock} disabled={isPending} className="gap-2 bg-amber-600 hover:bg-amber-700">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận khóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
