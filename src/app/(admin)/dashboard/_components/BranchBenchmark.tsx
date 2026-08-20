'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GitCompare, Trophy, AlertTriangle } from 'lucide-react'

export interface BranchBenchmarkItem {
  id: number
  name: string
  revenue: number
  occupancyRate: number // %
  badDebt: number // đ
  utilityCost: number // đ
  totalRooms: number
  occupiedRooms: number
}

type BenchmarkMetric = 'revenue' | 'occupancyRate' | 'badDebt'

interface MetricConfig {
  key: BenchmarkMetric
  label: string
  color: string
  activeBg: string
  unit: string
  formatter: (v: number) => string
}

const METRICS: MetricConfig[] = [
  {
    key: 'revenue',
    label: 'Tổng doanh thu',
    color: '#10b981',
    activeBg: 'bg-emerald-600',
    unit: 'đ',
    formatter: (v) => `${(v / 1_000_000).toFixed(1)}M`,
  },
  {
    key: 'occupancyRate',
    label: 'Tỷ lệ lấp đầy',
    color: '#6366f1',
    activeBg: 'bg-indigo-600',
    unit: '%',
    formatter: (v) => `${v.toFixed(0)}%`,
  },
  {
    key: 'badDebt',
    label: 'Công nợ xấu',
    color: '#ef4444',
    activeBg: 'bg-rose-600',
    unit: 'đ',
    formatter: (v) => `${(v / 1_000_000).toFixed(1)}M`,
  },
]

function BenchmarkTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean
  payload?: { value: number; payload: BranchBenchmarkItem }[]
  label?: string
  metric: MetricConfig
}) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  const val = payload[0].value

  return (
    <div className="bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/60 rounded-xl shadow-xl p-3 min-w-[160px] animate-in fade-in-50">
      <p className="text-xs font-semibold text-slate-300 pb-1 border-b border-slate-700">{label}</p>
      <div className="mt-2 space-y-1">
        <p className="text-sm font-bold text-white">
          {metric.key === 'occupancyRate'
            ? `${val.toFixed(0)}% (${item.occupiedRooms}/${item.totalRooms} phòng)`
            : `${val.toLocaleString('vi-VN')} đ`}
        </p>
        <p className="text-[11px] text-slate-400">
          Tổng phòng: {item.totalRooms} phòng ({item.occupiedRooms} đang thuê)
        </p>
      </div>
    </div>
  )
}

export function BranchBenchmark({ branches }: { branches: BranchBenchmarkItem[] }) {
  const [activeMetricKey, setActiveMetricKey] = useState<BenchmarkMetric>('revenue')
  const metric = METRICS.find((m) => m.key === activeMetricKey)!

  const sortedData = [...branches].sort((a, b) => {
    if (activeMetricKey === 'badDebt') {
      return b.badDebt - a.badDebt // highest debt first
    }
    return b[activeMetricKey] - a[activeMetricKey]
  })

  const values = sortedData.map((d) => d[activeMetricKey])
  const maxVal = Math.max(...values, 1)
  const minVal = Math.min(...values, 0)

  const bestBranch = sortedData[0]
  const worstBranch = sortedData[sortedData.length - 1]

  return (
    <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-600" />
            So sánh Hiệu suất giữa các Tòa nhà
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân tích chuyên sâu {branches.length} chi nhánh để tối ưu vận hành
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMetricKey(m.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeMetricKey === m.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {sortedData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">
            Chưa có dữ liệu chi nhánh
          </div>
        ) : (
          <>
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart
                  data={sortedData}
                  margin={{ top: 10, right: 10, left: 10, bottom: sortedData.length > 5 ? 40 : 10 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                    angle={sortedData.length > 5 ? -25 : 0}
                    textAnchor={sortedData.length > 5 ? 'end' : 'middle'}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={metric.formatter}
                    width={50}
                  />
                  <Tooltip content={<BenchmarkTooltip metric={metric} />} />
                  <Bar
                    dataKey={activeMetricKey}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    animationDuration={500}
                  >
                    {sortedData.map((entry, index) => {
                      const val = entry[activeMetricKey]
                      let fillColor = metric.color

                      if (activeMetricKey === 'badDebt') {
                        fillColor = val === maxVal ? '#ef4444' : val === minVal ? '#10b981' : '#f87171'
                      } else {
                        const ratio = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 1
                        const opacity = 0.45 + ratio * 0.55
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={fillColor}
                            fillOpacity={opacity}
                          />
                        )
                      }
                      return <Cell key={`cell-${index}`} fill={fillColor} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Insight Footers */}
            {branches.length > 1 && bestBranch && worstBranch && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800">Dẫn đầu hiệu suất: </span>
                    <span className="font-bold text-emerald-700">{bestBranch.name}</span>
                    <span className="text-slate-500 block">
                      Lấp đầy {bestBranch.occupancyRate.toFixed(0)}% • Thu {(bestBranch.revenue / 1_000_000).toFixed(1)}M
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-xs">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800">Cần chú ý thúc đẩy: </span>
                    <span className="font-bold text-amber-700">{worstBranch.name}</span>
                    <span className="text-slate-500 block">
                      Lấp đầy {worstBranch.occupancyRate.toFixed(0)}% • Nợ {(worstBranch.badDebt / 1_000_000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
