'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateTicketStatus } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type StatusType = 'pending' | 'in-progress' | 'resolved'

export default function StatusUpdater({
  ticketId,
  currentStatus,
}: {
  ticketId: number
  currentStatus: StatusType
}) {
  const [status, setStatus] = useState<StatusType>(currentStatus)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStatusChange = async (newStatus: StatusType | null) => {
    if (!newStatus) return
    setIsLoading(true)
    try {
      await updateTicketStatus(ticketId, newStatus)
      setStatus(newStatus)
      toast.success('Cập nhật trạng thái thành công')
      router.refresh()
    } catch (error) {
      toast.error('Lỗi: ' + (error as Error).message)
      setStatus(currentStatus) // revert
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={isLoading}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Trạng thái" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Chờ xử lý</SelectItem>
        <SelectItem value="in-progress">Đang sửa</SelectItem>
        <SelectItem value="resolved">Đã xong</SelectItem>
      </SelectContent>
    </Select>
  )
}
