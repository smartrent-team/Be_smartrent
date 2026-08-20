'use client'

import { Trophy, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export interface RankedBranchItem {
  id: number
  name: string
  score: number // composite 0-100
  revenue: number
  occupancyRate: number
  totalRooms: number
  occupiedRooms: number
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} tỷ`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  return `${amount.toLocaleString('vi-VN')}đ`
}

export function TopRankedBranches({
  best,
}: {
  best: RankedBranchItem[]
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Top Tòa nhà Hiệu suất Tốt nhất
          </h3>
          <p className="text-xs text-slate-500">
            Đánh giá tổng hợp theo doanh thu thực thu & tỷ lệ lấp đầy
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {best.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Chưa đủ dữ liệu để xếp hạng
          </p>
        ) : (
          best.map((b, i) => {
            const medalColors = [
              'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-200',
              'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-slate-200',
              'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-amber-200',
            ]

            return (
              <Link
                key={b.id}
                href={`/branches`}
                className="flex items-center justify-between p-3 rounded-xl border border-emerald-100/80 bg-emerald-50/40 hover:bg-emerald-50/90 hover:border-emerald-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg ${medalColors[i] || 'bg-emerald-500 text-white'} flex items-center justify-center font-extrabold text-xs shadow-sm shrink-0`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                      {b.name}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span>
                        Doanh thu:{' '}
                        <strong className="text-emerald-700 font-semibold">
                          {formatMoney(b.revenue)}
                        </strong>
                      </span>
                      <span>
                        Lấp đầy:{' '}
                        <strong className="text-emerald-700 font-semibold">
                          {b.occupancyRate.toFixed(0)}%
                        </strong>{' '}
                        ({b.occupiedRooms}/{b.totalRooms})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-white/80 text-emerald-600 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
