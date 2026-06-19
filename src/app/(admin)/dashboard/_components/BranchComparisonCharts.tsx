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

// ─── Types ────────────────────────────────────────────────────────────
export interface BranchKPI {
  name: string
  revenuePerSqm: number      // đ / m²
  occupancyRate: number       // 0-100
  badDebt: number             // đ
  utilityCost: number         // đ (electric + water)
}

type TabKey = 'revenuePerSqm' | 'occupancyRate' | 'badDebt' | 'utilityCost'

interface Tab {
  key: TabKey
  label: string
  color: string
  highlightColor: string
  formatter: (v: number) => string
  unit: string
}

const TABS: Tab[] = [
  {
    key: 'revenuePerSqm',
    label: 'Doanh thu / m²',
    color: '#10b981',
    highlightColor: '#059669',
    formatter: (v) => `${(v / 1000).toFixed(0)}K`,
    unit: 'đ/m²',
  },
  {
    key: 'occupancyRate',
    label: 'Tỷ lệ lấp đầy',
    color: '#6366f1',
    highlightColor: '#4f46e5',
    formatter: (v) => `${v}%`,
    unit: '%',
  },
  {
    key: 'badDebt',
    label: 'Nợ xấu',
    color: '#ef4444',
    highlightColor: '#dc2626',
    formatter: (v) => `${(v / 1_000_000).toFixed(1)}M`,
    unit: 'đ',
  },
  {
    key: 'utilityCost',
    label: 'Chi phí điện nước',
    color: '#f59e0b',
    highlightColor: '#d97706',
    formatter: (v) => `${(v / 1_000_000).toFixed(1)}M`,
    unit: 'đ',
  },
]

// ─── Custom Tooltip ───────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  tab,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  tab: Tab
}) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-3 min-w-[140px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color: tab.highlightColor }}>
        {tab.key === 'revenuePerSqm'
          ? `${value.toLocaleString('vi-VN')} đ/m²`
          : tab.key === 'occupancyRate'
          ? `${value}%`
          : `${value.toLocaleString('vi-VN')} đ`}
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────
export default function BranchComparisonCharts({ data }: { data: BranchKPI[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>('revenuePerSqm')
  const tab = TABS.find((t) => t.key === activeTab)!

  // Sort data so the bars are ordered from highest to lowest for the active metric
  const sortedData = [...data].sort((a, b) => {
    if (activeTab === 'badDebt') return b[activeTab] - a[activeTab] // worst first
    return b[activeTab] - a[activeTab]
  })

  // Determine best / worst for coloring
  const values = sortedData.map((d) => d[activeTab])
  const maxVal = Math.max(...values)
  const minVal = Math.min(...values)

  return (
    <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 tracking-tight">So sánh giữa các tòa nhà</h2>
          <p className="text-sm text-gray-500 mt-0.5">Phân tích 4 chỉ số chính — phát hiện vấn đề nhanh chóng</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === t.key
                ? 'text-white shadow-md scale-[1.02]'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
            style={
              activeTab === t.key
                ? { backgroundColor: t.color, boxShadow: `0 4px 14px ${t.color}40` }
                : undefined
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {sortedData.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
          Chưa có dữ liệu chi nhánh
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={sortedData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={sortedData.length > 6 ? -30 : 0}
              textAnchor={sortedData.length > 6 ? 'end' : 'middle'}
              height={sortedData.length > 6 ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={tab.formatter}
              width={55}
            />
            <Tooltip
              content={<ChartTooltip tab={tab} />}
              cursor={{ fill: `${tab.color}08` }}
            />
            <Bar dataKey={activeTab} radius={[8, 8, 0, 0]} maxBarSize={56} animationDuration={600}>
              {sortedData.map((entry, index) => {
                const val = entry[activeTab]
                // For badDebt: highest = worst (red), lowest = best (green)
                // For others: highest = best (strong color), lowest = lighter
                let fillColor = tab.color
                if (activeTab === 'badDebt') {
                  fillColor = val === maxVal ? '#ef4444' : val === minVal ? '#86efac' : '#fca5a5'
                } else {
                  const ratio = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 1
                  const opacity = 0.4 + ratio * 0.6
                  fillColor = tab.color
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
      )}
    </div>
  )
}
