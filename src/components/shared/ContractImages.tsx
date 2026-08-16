'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ContractImagesProps {
  tenantId: number
  roomId: number
  initialImages: string[]
}

export function ContractImages({ tenantId, roomId, initialImages }: ContractImagesProps) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [uploading, setUploading] = useState(false)

  const syncContractImages = async (nextImages: string[]) => {
    const response = await fetch(`/api/tenants/${tenantId}/contract-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractImages: nextImages,
        roomId,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Không thể lưu ảnh hợp đồng')
    }

    return Array.isArray(data.contractImages)
      ? data.contractImages.filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
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

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`, {
        method: 'POST',
        body: formData
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Không thể tải ảnh lên')

      const newImageUrl = uploadData.secure_url

      toast.loading('Đang lưu vào dữ liệu khách thuê...', { id: toastId })

      const newImagesList = [...images, newImageUrl]
      const syncedImages = await syncContractImages(newImagesList)

      setImages(syncedImages)
      toast.success('Tải ảnh hợp đồng thành công!', { id: toastId })
    } catch (error: unknown) {
      console.error(error)
      const errMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
      toast.error(errMessage, { id: toastId })
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  const handleDelete = async (urlToRemove: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này?')) return
    
    try {
      const newImagesList = images.filter(url => url !== urlToRemove)
      const syncedImages = await syncContractImages(newImagesList)
      
      setImages(syncedImages)
      toast.success('Đã xóa ảnh')
    } catch {
      toast.error('Lỗi khi xóa ảnh')
    }
  }

  return (
    <Card className="mt-6 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Bản chụp Hợp đồng
        </CardTitle>
        <div>
          <input
            type="file"
            id="contract-upload"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor="contract-upload" className="cursor-pointer">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Đang tải...' : 'Thêm ảnh'}
            </div>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((url, idx) => (
              <div key={idx} className="relative group rounded-md overflow-hidden border aspect-[3/4]">
                <Image 
                  src={url} 
                  alt={`Hợp đồng trang ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(url)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Chưa có ảnh chụp hợp đồng. Nhấn &quot;Thêm ảnh&quot; để tải lên bản cứng.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
