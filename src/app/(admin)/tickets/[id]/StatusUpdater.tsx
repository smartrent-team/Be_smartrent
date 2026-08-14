'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { updateTicketStatus } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type StatusType = 'pending' | 'in-progress' | 'resolved'

const STATUS_LABELS: Record<StatusType, string> = {
  'pending': 'Chờ xử lý',
  'in-progress': 'Đang sửa',
  'resolved': 'Đã xong',
}

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

  // Nếu đã hoàn thành, hiển thị badge cố định — không cho đổi lại
  if (status === 'resolved') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-100 text-green-700 font-semibold text-sm border border-green-200 w-[180px] justify-center select-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Đã hoàn tất
      </div>
    )
  }

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={isLoading}>
      <SelectTrigger className="w-[180px]">
        <span>{STATUS_LABELS[status] ?? status}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Chờ xử lý</SelectItem>
        <SelectItem value="in-progress">Đang sửa</SelectItem>
        <SelectItem value="resolved">Đã xong</SelectItem>
      </SelectContent>
    </Select>
  )
}
