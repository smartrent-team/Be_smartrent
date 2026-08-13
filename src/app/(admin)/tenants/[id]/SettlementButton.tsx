'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function SettlementButton({ checkoutRequestId }: { checkoutRequestId: string | number }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSettlement = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutRequestId })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Đã lập bảng quyết toán và gửi cho khách thuê thành công!')
        router.refresh()
      } else {
        toast.error(data.error || 'Có lỗi xảy ra khi tạo quyết toán')
      }
    } catch (error) {
      toast.error('Không thể kết nối đến máy chủ')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleSettlement} 
      disabled={isLoading}
      className="bg-orange-600 hover:bg-orange-700 text-white"
    >
      <CheckCircle className="mr-2 h-4 w-4" />
      {isLoading ? 'Đang xử lý...' : 'Chốt Quyết Toán Trả Phòng'}
    </Button>
  )
}
