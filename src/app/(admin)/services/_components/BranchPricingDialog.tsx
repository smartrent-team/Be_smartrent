'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Settings2, Loader2, Tag, Building2, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { upsertBranchService, deleteBranchService } from '../actions'

interface Branch {
  id: number
  name: string
}

interface BranchService {
  branch_id: number
  price: number
  unit: string | null
  is_active: boolean
}

interface BranchPricingDialogProps {
  service: { id: number; name: string }
  branches: Branch[]
  branchServices: BranchService[]
}

export function BranchPricingDialog({ service, branches, branchServices }: BranchPricingDialogProps) {
  const [open, setOpen] = useState(false)

  // State riêng cho từng chi nhánh: key = branch_id
  const [rows, setRows] = useState<
    Record<number, { price: string; unit: string; isActive: boolean; loading: boolean; removing: boolean }>
  >(() => {
    const init: Record<number, { price: string; unit: string; isActive: boolean; loading: boolean; removing: boolean }> = {}
    branches.forEach((b) => {
      const existing = branchServices.find((bs) => bs.branch_id === b.id)
      init[b.id] = {
        price: existing ? String(existing.price) : '',
        unit: existing?.unit ?? '',
        isActive: existing?.is_active ?? true,
        loading: false,
        removing: false,
      }
    })
    return init
  })

  const hasConfig = (branchId: number) =>
    branchServices.some((bs) => bs.branch_id === branchId)

  const updateRow = (branchId: number, patch: Partial<(typeof rows)[number]>) =>
    setRows((prev) => ({ ...prev, [branchId]: { ...prev[branchId], ...patch } }))

  const handleSave = async (branchId: number) => {
    const row = rows[branchId]
    const price = parseFloat(row.price)
    if (isNaN(price) || price < 0) {
      toast.error('Giá không hợp lệ')
      return
    }
    updateRow(branchId, { loading: true })
    try {
      await upsertBranchService({
        serviceId: service.id,
        branchId,
        price,
        unit: row.unit.trim() || null,
        isActive: row.isActive,
      })
      toast.success(`Đã lưu giá cho chi nhánh!`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Lỗi khi lưu')
    } finally {
      updateRow(branchId, { loading: false })
    }
  }

  const handleRemove = async (branchId: number) => {
    updateRow(branchId, { removing: true })
    try {
      await deleteBranchService(service.id, branchId)
      updateRow(branchId, { price: '', unit: '', isActive: true })
      toast.success('Đã xóa cấu hình giá cho chi nhánh này')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Lỗi khi xóa')
    } finally {
      updateRow(branchId, { removing: false })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-lg h-9 w-9"
            title="Cấu hình giá theo chi nhánh"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto border border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-500" />
            Cấu hình giá theo Chi nhánh
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1">
            Dịch vụ: <span className="font-semibold text-gray-700">{service.name}</span>
            <br />
            Mỗi chi nhánh có thể có giá và đơn vị tính riêng, hoặc tắt dịch vụ này cho chi nhánh đó.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {branches.map((branch) => {
            const row = rows[branch.id]
            const configured = hasConfig(branch.id)

            return (
              <div
                key={branch.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3"
              >
                {/* Branch header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold uppercase">
                      {branch.name.slice(0, 2)}
                    </div>
                    <span className="font-semibold text-sm text-gray-800">{branch.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {configured ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Đã cấu hình
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400 border-gray-200 text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Chưa có giá
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Tag className="h-3 w-3 text-emerald-500" />
                      Giá (VNĐ)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="VD: 50000"
                      value={row.price}
                      onChange={(e) => updateRow(branch.id, { price: e.target.value })}
                      className="h-9 text-sm border-gray-200 focus:border-teal-500 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-indigo-400" />
                      Đơn vị tính
                    </label>
                    <Input
                      placeholder="VD: lần, tháng, kg..."
                      value={row.unit}
                      onChange={(e) => updateRow(branch.id, { unit: e.target.value })}
                      className="h-9 text-sm border-gray-200 focus:border-teal-500 rounded-lg"
                    />
                  </div>
                </div>

                {/* Toggle + actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.isActive}
                    onClick={() => updateRow(branch.id, { isActive: !row.isActive })}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        row.isActive ? 'bg-teal-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          row.isActive ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                    <span className={row.isActive ? 'text-teal-700 font-medium' : 'text-gray-400'}>
                      {row.isActive ? 'Đang áp dụng' : 'Tạm ngưng'}
                    </span>
                  </button>

                  <div className="flex gap-2">
                    {configured && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={row.removing}
                        onClick={() => handleRemove(branch.id)}
                        className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs"
                      >
                        {row.removing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={row.loading || !row.price}
                      onClick={() => handleSave(branch.id)}
                      className="h-8 px-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-xs font-medium"
                    >
                      {row.loading ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          Lưu...
                        </>
                      ) : (
                        'Lưu giá'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}

          {branches.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Chưa có chi nhánh nào trong hệ thống.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
