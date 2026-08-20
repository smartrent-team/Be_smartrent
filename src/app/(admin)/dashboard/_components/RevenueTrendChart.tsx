'use client'

import { useState, useEffect } from 'react'
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Calendar } from 'lucide-react'

export interface MonthTrendData {
  month: string
  revenue: number
  occupancyRate: number
  paidInvoicesCount: number
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string; payload: MonthTrendData }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const revData = payload.find((p) => p.dataKey === 'revenue')
  const occData = payload.find((p) => p.dataKey === 'occupancyRate')

  return (
    <div className="bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/60 rounded-xl shadow-2xl p-4 min-w-[200px] animate-in fade-in-50 zoom-in-95">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider pb-2 border-b border-slate-700">
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span>Tháng {label}</span>
      </div>

      <div className="space-y-2 mt-2.5">
        {revData && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm" />
              Doanh thu thực:
            </span>
            <span className="text-sm font-bold text-emerald-400">
              {(revData.value / 1_000_000).toFixed(2)}M đ
            </span>
          </div>
        )}

        {occData && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block shadow-sm" />
              Tỷ lệ lấp đầy:
            </span>
            <span className="text-sm font-bold text-indigo-300">
              {occData.value.toFixed(0)}%
            </span>
          </div>
        )}

        {revData?.payload?.paidInvoicesCount !== undefined && (
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
            <span>Hóa đơn đã thu:</span>
            <span className="font-medium text-slate-200">{revData.payload.paidInvoicesCount} đơn</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function RevenueTrendChart({ data }: { data: MonthTrendData[] }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const totalPeriodRevenue = data.reduce((s, m) => s + m.revenue, 0)
  const avgOccupancy = data.length > 0
    ? Math.round(data.reduce((s, m) => s + m.occupancyRate, 0) / data.length)
    : 0

  return (
    <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Xu hướng Doanh thu & Tỷ lệ Lấp đầy
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Tổng thu kỳ này:{' '}
            <span className="font-bold text-emerald-600">
              {(totalPeriodRevenue / 1_000_000).toFixed(1)}M đ
            </span>{' '}
            • Lấp đầy TB: <span className="font-bold text-indigo-600">{avgOccupancy}%</span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">
            Chưa có dữ liệu giao dịch trong khoảng thời gian này
          </div>
        ) : (
          <div className="h-[280px] w-full min-w-0">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ComposedChart data={data} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />

                  <YAxis
                    yAxisId="rev"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                    width={45}
                  />

                  <YAxis
                    yAxisId="occ"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={35}
                  />

                  <Tooltip content={<TrendTooltip />} />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                    formatter={(val) => (val === 'revenue' ? 'Doanh thu thực' : 'Tỷ lệ lấp đầy')}
                  />

                  <Area
                    yAxisId="rev"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                  />

                  <Line
                    yAxisId="occ"
                    type="monotone"
                    dataKey="occupancyRate"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
