'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  History,
  Upload,
  X,
  Loader2,
  Maximize2,
  Calendar,
  Home,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export interface ContractInfo {
  contractId: number
  roomId?: number
  roomCode?: string
  floor?: number | string
  startDate?: string | null
  endDate?: string | null
  status: string
  images: string[]
}

interface ContractImagesProps {
  tenantId: number
  currentRoomId: number
  currentRoomCode?: string
  currentRoomFloor?: number | string
  activeContract?: ContractInfo | null
  oldContracts?: ContractInfo[]
}

export function ContractImages({
  tenantId,
  currentRoomId,
  currentRoomCode,
  currentRoomFloor,
  activeContract,
  oldContracts = [],
}: ContractImagesProps) {
  const [activeImages, setActiveImages] = useState<string[]>(
    activeContract?.images || []
  )
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const syncContractImages = async (nextImages: string[]) => {
    const response = await fetch(`/api/tenants/${tenantId}/contract-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractImages: nextImages,
        roomId: currentRoomId,
        contractId: activeContract?.contractId,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Không thể lưu ảnh hợp đồng')
    }

    return Array.isArray(data.contractImages)
      ? data.contractImages.filter(
          (url: unknown): url is string => typeof url === 'string' && url.length > 0
        )
      : nextImages
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Đang lấy chữ ký bảo mật...')

    try {
      // 1. Get Signature
      const sigRes = await fetch(`/api/upload/signature?folder=contracts_${tenantId}`)
      const sigData = await sigRes.json()
      if (!sigRes.ok) throw new Error(sigData.error || 'Không thể lấy chữ ký')

      toast.loading('Đang tải ảnh lên Cloudinary...', { id: toastId })

      // 2. Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', sigData.api_key)
      formData.append('timestamp', sigData.timestamp.toString())
      formData.append('signature', sigData.signature)
      formData.append('folder', sigData.folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok)
        throw new Error(uploadData.error?.message || 'Không thể tải ảnh lên')

      const newImageUrl = uploadData.secure_url

      toast.loading('Đang cập nhật hợp đồng hiện tại...', { id: toastId })

      const newImagesList = [...activeImages, newImageUrl]
      const syncedImages = await syncContractImages(newImagesList)

      setActiveImages(syncedImages)
      toast.success('Tải ảnh hợp đồng mới thành công!', { id: toastId })
    } catch (error: unknown) {
      console.error(error)
      const errMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
      toast.error(errMessage, { id: toastId })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteActiveImage = async (urlToRemove: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi hợp đồng hiện tại?')) return

    try {
      const newImagesList = activeImages.filter((url) => url !== urlToRemove)
      const syncedImages = await syncContractImages(newImagesList)

      setActiveImages(syncedImages)
      toast.success('Đã xóa ảnh')
    } catch {
      toast.error('Lỗi khi xóa ảnh')
    }
  }

  const formatViDate = (dateStr?: string | null) => {
    if (!dateStr) return '---'
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN')
    } catch {
      return dateStr
    }
  }

  const hasOldContracts = oldContracts.length > 0

  return (
    <Card className="mt-6 md:col-span-2 overflow-hidden shadow-sm border-gray-200">
      <CardHeader className="bg-slate-50/70 border-b border-gray-100 py-4 px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Bản chụp Hợp đồng & Lịch sử
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quản lý ảnh hợp đồng hiện tại và đối chiếu hợp đồng các phòng cũ đã thuê.
              </p>
            </div>
          </div>
          <div>
            <input
              type="file"
              id="contract-upload-active"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <label htmlFor="contract-upload-active" className="cursor-pointer">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 pointer-events-none"
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Đang tải...' : 'Thêm ảnh hợp đồng mới'}
              </Button>
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CỘT 1: HỢP ĐỒNG HIỆN TẠI (MỚI) */}
          <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/30 p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-xs px-2.5 py-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  HỢP ĐỒNG MỚI (HIỆN TẠI)
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                <Home className="w-3.5 h-3.5" />
                <span>
                  Phòng {currentRoomCode || activeContract?.roomCode || '---'}
                  {currentRoomFloor ? ` · Tầng ${currentRoomFloor}` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600 bg-white/80 rounded-lg p-2.5 border border-emerald-100">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bắt đầu: <strong>{formatViDate(activeContract?.startDate)}</strong></span>
              </div>
              <div className="text-gray-300">|</div>
              <div>
                <span>Hết hạn: <strong>{formatViDate(activeContract?.endDate)}</strong></span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span>Ảnh bản chụp ({activeImages.length} trang)</span>
                <span className="text-[11px] text-muted-foreground font-normal">Click ảnh để phóng to</span>
              </p>

              {activeImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-emerald-200 aspect-[3/4] bg-white shadow-sm hover:shadow transition-all"
                    >
                      <Image
                        src={url}
                        alt={`Hợp đồng mới trang ${idx + 1}`}
                        fill
                        className="object-cover cursor-pointer"
                        onClick={() => setPreviewImage(url)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-white/90 text-gray-800 hover:bg-white"
                          onClick={() => setPreviewImage(url)}
                          title="Phóng to"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={() => handleDeleteActiveImage(url)}
                          title="Xóa ảnh"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-white/60 p-6 text-center">
                  <p className="text-xs text-gray-500">
                    Chưa có ảnh hợp đồng mới.
                  </p>
                  <label htmlFor="contract-upload-active" className="cursor-pointer">
                    <span className="text-xs font-semibold text-emerald-600 hover:underline mt-1 inline-block">
                      + Tải ảnh lên ngay
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* CỘT 2: HỢP ĐỒNG CŨ / LỊCH SỬ TRƯỚC ĐÓ */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-slate-50/60 p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 font-semibold text-xs px-2.5 py-0.5">
                  <History className="w-3.5 h-3.5 mr-1 text-gray-500" />
                  HỢP ĐỒNG CŨ (LỊCH SỬ ĐỔI PHÒNG)
                </Badge>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {hasOldContracts ? `${oldContracts.length} hợp đồng cũ` : 'Không có'}
              </span>
            </div>

            {hasOldContracts ? (
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {oldContracts.map((oldC, cIdx) => (
                  <div
                    key={oldC.contractId || cIdx}
                    className="rounded-lg bg-white border border-gray-200 p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                        <Home className="w-3.5 h-3.5 text-gray-500" />
                        <span>
                          Phòng {oldC.roomCode || '---'}
                          {oldC.floor ? ` · Tầng ${oldC.floor}` : ''}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-300">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        Đã kết thúc
                      </Badge>
                    </div>

                    <div className="text-[11.5px] text-gray-500 bg-gray-50 rounded p-1.5 flex items-center justify-between">
                      <span>Thời hạn thuê:</span>
                      <span className="font-medium text-gray-700">
                        {formatViDate(oldC.startDate)} ➔ {formatViDate(oldC.endDate)}
                      </span>
                    </div>

                    {oldC.images && oldC.images.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {oldC.images.map((url, iIdx) => (
                          <div
                            key={iIdx}
                            className="relative group rounded-md overflow-hidden border border-gray-200 aspect-[3/4] bg-gray-50"
                          >
                            <Image
                              src={url}
                              alt={`Hợp đồng cũ trang ${iIdx + 1}`}
                              fill
                              className="object-cover cursor-pointer"
                              onClick={() => setPreviewImage(url)}
                            />
                            <div
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              onClick={() => setPreviewImage(url)}
                            >
                              <Maximize2 className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic text-center py-2">
                        Hợp đồng này không có ảnh đính kèm.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-8 text-center flex flex-col items-center justify-center flex-1 min-h-[160px]">
                <History className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-xs font-medium text-gray-600">
                  Chưa có lịch sử hợp đồng cũ
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
                  Khi khách thuê thực hiện đổi phòng, hợp đồng của phòng cũ sẽ được tự động lưu trữ và hiển thị tại đây để đối soát.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Modal phóng to ảnh */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 z-10 rounded-full bg-white/90 hover:bg-white text-black"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="relative w-full h-full">
              <Image
                src={previewImage}
                alt="Phóng to hợp đồng"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
