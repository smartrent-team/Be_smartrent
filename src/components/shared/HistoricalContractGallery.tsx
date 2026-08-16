'use client'

import { useState } from 'react'

interface HistoricalContractCard {
  id: string | number
  roomCode?: string | null
  startDate?: string | null
  endDate?: string | null
  images?: string[]
}

export function HistoricalContractGallery({
  contracts,
}: {
  contracts: HistoricalContractCard[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!contracts.length) return null

  return (
    <div className="space-y-2">
      {contracts.map((contract) => {
        const contractId = String(contract.id)
        const isOpen = expandedId === contractId

        return (
          <div key={contractId} className="rounded-md border bg-muted/20">
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : contractId)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
            >
              <div>
                <div className="font-medium">HĐ #{contract.id}</div>
                <div className="text-xs text-muted-foreground">
                  {contract.roomCode ? `Phòng ${contract.roomCode}` : 'Phòng cũ'}
                  {' • '}
                  {contract.startDate ? new Date(contract.startDate).toLocaleDateString('vi-VN') : '---'}
                  {' '}→{' '}
                  {contract.endDate ? new Date(contract.endDate).toLocaleDateString('vi-VN') : '---'}
                </div>
              </div>
              <span className="rounded-full bg-gray-200 px-2 py-1 text-[10px] font-medium text-gray-700">
                {isOpen ? 'Đóng' : 'Cũ'}
              </span>
            </button>

            {isOpen && (
              <div className="border-t bg-white/40 p-3">
                {contract.images && contract.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {contract.images.map((image, index) => (
                      <div key={`${contractId}-${index}`} className="overflow-hidden rounded-md border bg-slate-50">
                        <img
                          src={image}
                          alt={`Hợp đồng cũ ${contract.id} - ảnh ${index + 1}`}
                          className="h-40 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Không có ảnh cho hợp đồng cũ này.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
