'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface RevenueData {
  month: string
  revenue: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-lg font-bold text-emerald-600">
          {(payload[0].value / 1_000_000).toFixed(1)}M đ
        </p>
      </div>
    )
  }
  return null
}

export function RevenueChartClient({ data }: { data: RevenueData[] }) {
  return (
    <div className="w-full min-w-0 h-[260px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
          <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
