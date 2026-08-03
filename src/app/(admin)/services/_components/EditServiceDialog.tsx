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
import {
  Edit, Loader2,
  CalendarClock, Gauge,
  DoorOpen, User, Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { editService } from '../actions'
import type { ServiceType, BillingType } from '../actions'
import { cn } from '@/lib/utils'

const SERVICE_TYPE_OPTIONS: {
  value: ServiceType
  label: string
  sub: string
  icon: React.ReactNode
  border: string
  bg: string
  text: string
  iconColor: string
}[] = [
  {
    value: 'fixed',
    label: 'Cố định',
    sub: 'Thu hàng tháng',
    icon: <CalendarClock className="h-5 w-5" />,
    border: 'border-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', iconColor: 'text-teal-600',
  },
  {
    value: 'metered',
    label: 'Theo chỉ số',
    sub: 'Điện, nước...',
    icon: <Gauge className="h-5 w-5" />,
    border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', iconColor: 'text-blue-600',
  },
]

const BILLING_OPTIONS: {
  value: BillingType
  label: string
  sub: string
  icon: React.ReactNode
}[] = [
  { value: 'per_room',   label: 'Theo phòng',     sub: 'Dùng chung cả phòng',  icon: <DoorOpen className="h-5 w-5" /> },
  { value: 'per_person', label: 'Theo người',     sub: 'Tính riêng từng người', icon: <User className="h-5 w-5" /> },
  { value: 'per_unit',   label: 'Theo số lượng',  sub: 'Theo chỉ số / lượt',   icon: <Hash className="h-5 w-5" /> },
]

interface Service {
  id: number
  name: string
  description: string | null
  service_type: ServiceType
  billing_type: BillingType
}

export function EditServiceDialog({ service }: { service: Service }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serviceType, setServiceType] = useState<ServiceType>(service.service_type ?? 'fixed')
  const [billingType, setBillingType] = useState<BillingType>(service.billing_type ?? 'per_room')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('service_type', serviceType)
    formData.set('billing_type', billingType)
    try {
      await editService(service.id, formData)
      toast.success('Đã cập nhật dịch vụ thành công!')
      setOpen(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật dịch vụ')
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
            title="Sửa dịch vụ"
          >
            <Edit className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[540px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Sửa Thông Tin Dịch Vụ
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Cập nhật loại, cách tính và tên dịch vụ. Giá theo chi nhánh chỉnh qua nút &ldquo;Cấu hình giá&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">

          {/* Loại dịch vụ */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Loại dịch vụ</Label>
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setServiceType(opt.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-medium transition-all',
                    serviceType === opt.value
                      ? `${opt.border} ${opt.bg} ${opt.text}`
                      : 'border-gray-200 bg-gray-50/50 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <span className={serviceType === opt.value ? opt.iconColor : 'text-gray-400 shrink-0'}>
                    {opt.icon}
                  </span>
                  <div className="text-left">
                    <p className="font-semibold leading-none">{opt.label}</p>
                    <p className="mt-0.5 opacity-70">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cách tính tiền */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Cách tính tiền</Label>
            <div className="grid grid-cols-3 gap-2">
              {BILLING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBillingType(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-all',
                    billingType === opt.value
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-gray-50/50 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <span className={billingType === opt.value ? 'text-amber-600' : 'text-gray-400'}>
                    {opt.icon}
                  </span>
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-center leading-tight opacity-70">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tên */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Tên dịch vụ <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={service.name}
              placeholder="VD: Wifi, Tiền điện, Sửa chữa..."
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              required
            />
          </div>

          {/* Mô tả */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Mô tả dịch vụ
            </Label>
            <Input
              id="description"
              name="description"
              defaultValue={service.description || ''}
              placeholder="VD: Mô tả ngắn về dịch vụ..."
              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang cập nhật...</>
              ) : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
