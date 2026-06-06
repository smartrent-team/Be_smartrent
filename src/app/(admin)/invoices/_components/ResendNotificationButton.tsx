'use client'

import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { resendInvoiceNotification } from '../actions'
import { useState } from 'react'

export function ResendNotificationButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await resendInvoiceNotification(invoiceId)
      if (res.success) {
        alert('Đã gửi thông báo thành công!')
      } else {
        alert('Lỗi: ' + res.error)
      }
    } catch {
      alert('Có lỗi xảy ra khi gửi thông báo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2" 
      onClick={handleSend}
      disabled={loading}
    >
      <Send className="h-3 w-3" /> {loading ? 'Đang gửi...' : 'Gửi link'}
    </Button>
  )
}
