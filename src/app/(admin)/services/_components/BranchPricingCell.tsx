'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, XCircle, ChevronDown, Building2 } from 'lucide-react'

interface PricingRow {
  branch_id: number
  price: number | string
  unit: string | null
  is_active: boolean
}

interface Branch {
  id: number
  name: string
}

interface Props {
  pricings: PricingRow[]
  branches: Branch[]
}

function formatPrice(price: number | string, unit: string | null) {
  return `${Number(price).toLocaleString('vi-VN')}đ${unit ? `/${unit}` : ''}`
}

export function BranchPricingCell({ pricings, branches }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (pricings.length === 0) {
    return <span className="text-xs italic text-gray-400">Chưa cấu hình giá</span>
  }

  const activeCount = pricings.filter(p => p.is_active).length
  const totalCount = pricings.length

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span>{activeCount}/{totalCount} cơ sở</span>
        <ChevronDown className={`h-3 w-3 text-emerald-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
          style={{ minWidth: '20rem' }}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-gray-500" />
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Giá theo cơ sở
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {activeCount} hoạt động / {totalCount} cơ sở
            </span>
          </div>

          {/* Danh sách */}
          <div className="divide-y max-h-72 overflow-y-auto">
            {pricings.map((ps, idx) => {
              const branch = branches.find(b => b.id === ps.branch_id)
              const branchName = branch?.name ?? `Cơ sở #${ps.branch_id}`
              const isActive = ps.is_active

              return (
                <div
                  key={ps.branch_id}
                  className={`flex items-center justify-between px-3 py-2.5 gap-3 ${
                    isActive ? 'hover:bg-emerald-50/50' : 'bg-gray-50/60 hover:bg-gray-100/60'
                  }`}
                >
                  {/* Left: số thứ tự + icon + tên đầy đủ */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Index badge */}
                    <span className={`flex-shrink-0 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>

                    {/* Status icon */}
                    {isActive ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    )}

                    {/* Tên đầy đủ — không bị cắt */}
                    <span className={`text-sm font-medium truncate ${
                      isActive ? 'text-gray-800' : 'text-gray-400'
                    }`}>
                      {branchName}
                    </span>
                  </div>

                  {/* Right: giá */}
                  <span className={`text-sm shrink-0 font-mono font-semibold ${
                    isActive ? 'text-emerald-700' : 'text-gray-400'
                  }`}>
                    {formatPrice(ps.price, ps.unit)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Footer nếu có cơ sở inactive */}
          {activeCount < totalCount && (
            <div className="px-3 py-2 border-t bg-amber-50/70 flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">
                {totalCount - activeCount} cơ sở đang tắt
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
