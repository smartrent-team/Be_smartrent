'use client'

import { TrendingUp, TrendingDown, Trophy, AlertTriangle } from 'lucide-react'

export interface RankedBranch {
  name: string
  score: number          // composite score (0-100)
  revenue: number        // total revenue this month
  occupancyRate: number  // 0-100%
}

function formatRevenue(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toString()
}

function BranchCard({
  branch,
  rank,
  type,
}: {
  branch: RankedBranch
  rank: number
  type: 'best' | 'worst'
}) {
  const isBest = type === 'best'
  const bgGradient = isBest
    ? 'from-emerald-50 to-teal-50 border-emerald-100/60'
    : 'from-red-50 to-orange-50 border-red-100/60'
  const badgeColor = isBest
    ? rank === 1 ? 'bg-emerald-500' : rank === 2 ? 'bg-teal-400' : 'bg-cyan-400'
    : rank === 1 ? 'bg-red-500' : rank === 2 ? 'bg-orange-400' : 'bg-amber-400'

  return (
    <div className={`flex items-center gap-3.5 p-3.5 rounded-xl bg-gradient-to-br ${bgGradient} border transition-all duration-200 hover:scale-[1.01] hover:shadow-sm`}>
      {/* Rank badge */}
      <div className={`w-8 h-8 rounded-lg ${badgeColor} text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0`}>
        {rank}
      </div>

      {/* Branch info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{branch.name}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500">
            DT: <span className={`font-semibold ${isBest ? 'text-emerald-600' : 'text-red-600'}`}>{formatRevenue(branch.revenue)}đ</span>
          </span>
          <span className="text-xs text-gray-500">
            Lấp đầy: <span className={`font-semibold ${isBest ? 'text-emerald-600' : 'text-red-600'}`}>{branch.occupancyRate}%</span>
          </span>
        </div>
      </div>

      {/* Trend icon */}
      <div className={`shrink-0 ${isBest ? 'text-emerald-500' : 'text-red-400'}`}>
        {isBest ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      </div>
    </div>
  )
}

export default function TopBranches({
  best,
  worst,
}: {
  best: RankedBranch[]
  worst: RankedBranch[]
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Top 3 Best */}
      <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Trophy className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Top 3 tòa nhà tốt nhất</h3>
            <p className="text-xs text-gray-500">Dựa trên doanh thu & tỷ lệ lấp đầy</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {best.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Chưa đủ dữ liệu</p>
          ) : (
            best.map((b, i) => (
              <BranchCard key={b.name} branch={b} rank={i + 1} type="best" />
            ))
          )}
        </div>
      </div>

      {/* Top 3 Worst */}
      <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Top 3 tòa nhà cần chú ý</h3>
            <p className="text-xs text-gray-500">Hiệu suất thấp nhất — cần kiểm tra</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {worst.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Chưa đủ dữ liệu</p>
          ) : (
            worst.map((b, i) => (
              <BranchCard key={b.name} branch={b} rank={i + 1} type="worst" />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
