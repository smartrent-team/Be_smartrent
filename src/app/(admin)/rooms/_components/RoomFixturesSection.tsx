'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, Loader2, Sofa } from 'lucide-react'
import { toast } from 'sonner'
import { addRoomFixture, updateRoomFixture, deleteRoomFixture } from '../[id]/actions'

interface Fixture {
  id: number
  name: string
  quantity: number
  status: string
  description: string | null
  createdAt: string
}

interface RoomFixturesSectionProps {
  roomId: number
  fixtures: Fixture[]
}

export function RoomFixturesSection({ roomId, fixtures }: RoomFixturesSectionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    quantity: '1',
    status: 'good',
    description: '',
  })

  const handleOpenAdd = () => {
    setSelectedFixture(null)
    setFormData({
      name: '',
      quantity: '1',
      status: 'good',
      description: '',
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (fixture: Fixture) => {
    setSelectedFixture(fixture)
    setFormData({
      name: fixture.name,
      quantity: fixture.quantity.toString(),
      status: fixture.status,
      description: fixture.description || '',
    })
    setDialogOpen(true)
  }

  const handleOpenDelete = (fixture: Fixture) => {
    setSelectedFixture(fixture)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.quantity) {
      toast.error('Vui lòng nhập tên đồ dùng và số lượng')
      return
    }

    setLoading(true)
    try {
      if (selectedFixture) {
        // Edit mode
        await updateRoomFixture(selectedFixture.id, roomId, {
          name: formData.name.trim(),
          quantity: parseInt(formData.quantity, 10),
          status: formData.status,
          description: formData.description,
        })
        toast.success('Cập nhật đồ cố định thành công!')
      } else {
        // Add mode
        await addRoomFixture({
          roomId,
          name: formData.name.trim(),
          quantity: parseInt(formData.quantity, 10),
          status: formData.status,
          description: formData.description,
        })
        toast.success('Thêm đồ cố định thành công!')
      }
      setDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Đã xảy ra lỗi khi lưu thông tin')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedFixture) return
    setLoading(true)
    try {
      await deleteRoomFixture(selectedFixture.id, roomId)
      toast.success('Đã xóa đồ cố định thành công!')
      setDeleteDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Đã xảy ra lỗi khi xóa đồ cố định')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-medium rounded-full">Tốt</Badge>
      case 'broken':
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none font-medium rounded-full">Hỏng</Badge>
      case 'maintenance':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-medium rounded-full">Bảo trì</Badge>
      default:
        return <Badge variant="outline" className="font-medium rounded-full">{status}</Badge>
    }
  }

  return (
    <Card className="shadow-md border border-gray-100 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-50 bg-gray-50/30">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <Sofa className="h-5 w-5 text-teal-600" />
          Đồ cố định trong phòng
          <span className="text-sm font-normal text-muted-foreground ml-1">({fixtures.length})</span>
        </CardTitle>
        <Button
          onClick={handleOpenAdd}
          size="sm"
          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl shadow-sm transition-all duration-200 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Thêm đồ dùng
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {fixtures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="h-14 w-14 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <Sofa className="h-6 w-6 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700 text-base">Chưa có đồ cố định</p>
            <p className="text-sm text-gray-400 mt-1 max-w-[280px]">
              Chưa có đồ dùng cố định nào được ghi nhận cho phòng này.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {fixtures.map((fixture) => (
              <div key={fixture.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors duration-150">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 truncate text-sm md:text-base">
                      {fixture.name}
                    </p>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 rounded-md py-0 px-2 font-semibold">
                      Số lượng: {fixture.quantity}
                    </Badge>
                    {getStatusBadge(fixture.status)}
                  </div>
                  {fixture.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 italic">
                      {fixture.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    onClick={() => handleOpenEdit(fixture)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    onClick={() => handleOpenDelete(fixture)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
              {selectedFixture ? 'Cập Nhật Đồ Cố Định' : 'Thêm Đồ Cố Định Mới'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-1">
              {selectedFixture ? 'Chỉnh sửa thông tin thiết bị, đồ dùng trong phòng.' : 'Khai báo đồ dùng, trang thiết bị cố định mới trong phòng này.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fixture-name" className="text-sm font-medium text-gray-700">
                Tên đồ dùng <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="fixture-name"
                placeholder="VD: Điều hòa Daikin, Giường ngủ gỗ..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fixture-quantity" className="text-sm font-medium text-gray-700">
                  Số lượng <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="fixture-quantity"
                  type="number"
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                  min={1}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixture-status" className="text-sm font-medium text-gray-700">
                  Trạng thái
                </Label>
                <select
                  id="fixture-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 focus:border-teal-500 focus:ring-teal-500 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="good">Tốt</option>
                  <option value="broken">Hỏng</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixture-desc" className="text-sm font-medium text-gray-700">
                Mô tả / Ghi chú
              </Label>
              <Input
                id="fixture-desc"
                placeholder="VD: Màu trắng, có vết trầy xước nhỏ..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
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
                    Đang lưu...
                  </>
                ) : (
                  'Lưu thông tin'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-800">Xác Nhận Xóa Đồ Cố Định</DialogTitle>
            <DialogDescription className="text-gray-500 mt-2">
              Bạn có chắc chắn muốn xóa đồ cố định <strong className="text-gray-700">"{selectedFixture?.name}"</strong> khỏi phòng này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl hover:bg-gray-100 text-gray-500"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                'Đồng ý xóa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
