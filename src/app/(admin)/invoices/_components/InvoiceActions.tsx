'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoreVertical, Send, Calendar, CheckSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { resendInvoiceNotification, updateInvoiceDueDate, markInvoicePaidManually } from '../actions'

interface InvoiceFormatted {
  id: number
  code: string
  room: string
  tenant: string
  date: string
  dueDate: string
  amount: number
  status: string
}

export function InvoiceActions({ invoice }: { invoice: InvoiceFormatted }) {
  const [loading, setLoading] = useState(false)
  const [dueDateOpen, setDueDateOpen] = useState(false)
  const [paidOpen, setPaidOpen] = useState(false)
  const [dueDateValue, setDueDateValue] = useState(() => {
    if (!invoice.dueDate) return ''
    const d = new Date(invoice.dueDate)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dateVal = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dateVal}`
  })

  // Handle Resend Notification Link
  const handleResend = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await resendInvoiceNotification(invoice.id)
      if (res.success) {
        toast.success('Đã gửi lại link thanh toán thành công!')
      } else {
        toast.error('Lỗi: ' + res.error)
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi gửi thông báo.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Save Due Date
  const handleSaveDueDate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dueDateValue) {
      toast.error('Vui lòng chọn ngày hết hạn.')
      return
    }
    setLoading(true)
    try {
      const formattedDate = new Date(`${dueDateValue}T23:59:59`).toISOString()
      const res = await updateInvoiceDueDate(invoice.id, formattedDate)
      if (res.success) {
        toast.success('Đã cập nhật ngày hết hạn hóa đơn!')
        setDueDateOpen(false)
      } else {
        toast.error('Lỗi: ' + res.error)
      }
    } catch (error) {
      toast.error('Lỗi cập nhật ngày hết hạn.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Mark Paid Manually
  const handleMarkPaid = async () => {
    setLoading(true)
    try {
      const res = await markInvoicePaidManually(invoice.id, 'cash')
      if (res.success) {
        toast.success('Đã chuyển trạng thái hóa đơn thành ĐÃ THANH TOÁN (Tiền mặt)!')
        setPaidOpen(false)
      } else {
        toast.error('Lỗi: ' + res.error)
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật thanh toán.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-gray-100"
            >
              <MoreVertical className="h-4 w-4 text-gray-500" />
              <span className="sr-only">Thao tác</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52 border border-gray-100 bg-white shadow-lg rounded-xl p-1">
          {invoice.status !== 'paid' && (
            <DropdownMenuItem
              onClick={handleResend}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer"
            >
              <Send className="h-4 w-4 text-teal-600" />
              <span>Gửi link thanh toán</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => setDueDateOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-amber-600" />
            <span>Sửa hạn thanh toán</span>
          </DropdownMenuItem>

          {invoice.status !== 'paid' && (
            <DropdownMenuItem
              onClick={() => setPaidOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer font-medium"
            >
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              <span>Xác nhận trả tiền mặt</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog: Edit Due Date */}
      <Dialog open={dueDateOpen} onOpenChange={setDueDateOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white border rounded-2xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Sửa Ngày Hết Hạn Hóa Đơn
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-1">
              Thay đổi hạn thanh toán cho hóa đơn {invoice.code}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDueDate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="due_date" className="text-sm font-medium text-gray-700">
                Hạn thanh toán mới
              </Label>
              <Input
                id="due_date"
                type="date"
                value={dueDateValue}
                onChange={(e) => setDueDateValue(e.target.value)}
                className="border-gray-200 focus:border-amber-500 focus:ring-amber-500 rounded-xl"
                required
              />
            </div>

            <DialogFooter className="pt-4 gap-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDueDateOpen(false)}
                className="rounded-xl text-gray-500 hover:bg-gray-100"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium px-4"
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

      {/* Dialog: Confirm Cash Payment */}
      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white border rounded-2xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Xác Nhận Trả Tiền Mặt
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-1">
              Bạn có chắc chắn muốn xác nhận hóa đơn <strong>{invoice.code}</strong> (Phòng P.{invoice.room}) đã được thanh toán bằng <strong>tiền mặt</strong> không?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 my-2">
            <div className="flex justify-between text-sm text-emerald-800">
              <span>Khách thuê:</span>
              <span className="font-semibold">{invoice.tenant}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-800 mt-1">
              <span>Số tiền:</span>
              <span className="font-bold">{invoice.amount.toLocaleString()}đ</span>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPaidOpen(false)}
              className="rounded-xl text-gray-500 hover:bg-gray-100"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleMarkPaid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium px-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
