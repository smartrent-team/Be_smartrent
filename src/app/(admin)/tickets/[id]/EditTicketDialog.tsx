'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { updateTicketDetails } from '../actions'

type PriorityType = 'low' | 'medium' | 'high'

export default function EditTicketDialog({
  ticketId,
  initialTitle,
  initialDescription,
  initialPriority,
}: {
  ticketId: number
  initialTitle: string
  initialDescription: string
  initialPriority: PriorityType
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [priority, setPriority] = useState<PriorityType>(initialPriority)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateTicketDetails(ticketId, { title, description, priority })
      toast.success('Cập nhật thông tin thành công')
      setIsOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi cập nhật thông tin')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" /> Sửa thông tin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa Báo hỏng</DialogTitle>
          <DialogDescription>
            Cập nhật lại thông tin sự cố để dễ dàng theo dõi và xử lý.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề sự cố</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Mức độ ưu tiên</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val as PriorityType)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn mức độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Thấp</SelectItem>
                <SelectItem value="medium">Bình thường</SelectItem>
                <SelectItem value="high">Gấp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả chi tiết</Label>
            <Textarea 
              id="description" 
              rows={4}
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
            <p className="text-xs text-muted-foreground">
              Có thể bổ sung thêm ghi chú cho thợ sửa chữa vào đây.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
