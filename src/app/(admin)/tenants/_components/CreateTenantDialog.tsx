'use client'

import { useState, useRef } from 'react'
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
import { UserPlus, Loader2, FileSearch, CheckCircle2, AlertCircle, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { createTenantAction } from '../actions'
import Image from 'next/image'

interface Room {
  id: number
  room_code: string
  base_price: number
}

export function CreateTenantDialog({ rooms }: { rooms: Room[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null)
  const [contractPreview, setContractPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const previewUrl = URL.createObjectURL(file)
    setContractPreview(previewUrl)

    setScanning(true)
    setScanResult(null)
    const toastId = toast.loading('🔍 Đang quét hợp đồng lấy tiền cọc...')

    try {
      const aiFormData = new FormData()
      aiFormData.append('file', file)

      const response = await fetch('/api/contracts/scan-deposit', {
        method: 'POST',
        body: aiFormData,
      })

      const data = await response.json()

      if (response.ok && data.success && data.data?.deposit_amount) {
        const depositAmount = data.data.deposit_amount
        setFormData((prev) => ({ ...prev, depositAmount: depositAmount.toString() }))
        setScanResult({
          success: true,
          message: `Đã nhận diện tiền cọc: ${depositAmount.toLocaleString('vi-VN')} đ`,
        })
        toast.success(`✅ Đã nhận diện tiền cọc: ${depositAmount.toLocaleString('vi-VN')} đ`, { id: toastId })
      } else {
        const errorMsg = data.error || 'Không đọc được tiền cọc từ ảnh hợp đồng'
        setScanResult({ success: false, message: errorMsg })
        toast.error(errorMsg, { id: toastId })
      }
    } catch {
      setScanResult({ success: false, message: 'Không thể kết nối dịch vụ AI' })
      toast.error('Không thể kết nối dịch vụ AI', { id: toastId })
    } finally {
      setScanning(false)
      e.target.value = ''
    }
  }

  const clearContractPreview = () => {
    if (contractPreview) {
      URL.revokeObjectURL(contractPreview)
    }
    setContractPreview(null)
    setScanResult(null)
  }

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
      clearContractPreview()
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        clearContractPreview()
      }
    }}>
      <DialogTrigger
        render={
          <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-md transition-all duration-200 gap-2">
            <UserPlus className="h-4 w-4" />
            Thêm khách mới
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[520px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
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
            <p className="text-xs text-amber-600">
              ⚠️ Bắt buộc nhập email thật để khách thuê có thể lấy lại mật khẩu.
            </p>
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

          {/* Upload ảnh hợp đồng + Quét tiền cọc */}
          <div className="space-y-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/30 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <FileSearch className="h-4 w-4 text-teal-600" />
                Quét hợp đồng lấy tiền cọc
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleContractUpload}
                disabled={scanning}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={scanning}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-100 hover:text-teal-800 rounded-lg"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Tải ảnh hợp đồng
                  </>
                )}
              </Button>
            </div>

            {/* Preview ảnh hợp đồng */}
            {contractPreview && (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white">
                <div className="relative aspect-[4/3] w-full max-h-[160px]">
                  <Image
                    src={contractPreview}
                    alt="Ảnh hợp đồng"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={clearContractPreview}
                  className="absolute top-1.5 right-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white p-1 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Kết quả quét */}
            {scanResult && (
              <div
                className={`flex items-start gap-2 text-xs p-2 rounded-lg ${
                  scanResult.success
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span>{scanResult.message}</span>
              </div>
            )}

            {!contractPreview && !scanResult && (
              <p className="text-xs text-gray-400 text-center">
                Tải ảnh hợp đồng lên để AI tự động nhận diện tiền cọc
              </p>
            )}
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
