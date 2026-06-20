'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from 'recharts'

export interface ChainOverviewData {
  month: string
  revenue: number
  occupancyRate: number
}

function ChainTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-3 min-w-[170px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-gray-600">
              {p.dataKey === 'revenue' ? 'Doanh thu' : 'Lấp đầy'}
            </span>
          </div>
          <span className="text-sm font-bold" style={{ color: p.color }}>
            {p.dataKey === 'revenue'
              ? `${(p.value / 1_000_000).toFixed(1)}M đ`
              : `${p.value}%`}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ChainOverviewChart({ data }: { data: ChainOverviewData[] }) {
  return (
    <div className="rounded-2xl border border-gray-100/80 bg-white shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800 tracking-tight">Doanh thu & Lấp đầy toàn chuỗi</h2>
        <p className="text-sm text-gray-500 mt-0.5">6 tháng gần nhất — biểu đồ kết hợp cột và đường</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
          Chưa có dữ liệu
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              width={50}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              width={40}
            />
            <Tooltip content={<ChainTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => (value === 'revenue' ? 'Doanh thu' : 'Tỷ lệ lấp đầy')}
            />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
              fillOpacity={0.85}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="occupancyRate"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
