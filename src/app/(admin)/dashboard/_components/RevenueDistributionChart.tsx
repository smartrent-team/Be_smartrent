'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart as PieIcon } from 'lucide-react'

export interface RevenueBreakdown {
  roomPrice: number
  electricCost: number
  waterCost: number
  serviceCost: number
  repairCost: number
}

const COLORS = {
  roomPrice: '#6366f1', // Indigo
  electricCost: '#f59e0b', // Amber
  waterCost: '#06b6d4', // Cyan
  serviceCost: '#10b981', // Emerald
  repairCost: '#ec4899', // Pink
}

const LABELS = {
  roomPrice: 'Tiền phòng',
  electricCost: 'Tiền điện',
  waterCost: 'Tiền nước',
  serviceCost: 'Dịch vụ',
  repairCost: 'Sửa chữa',
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { name: string; value: number; key: string } }[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/60 rounded-xl shadow-xl p-3 min-w-[140px]">
      <p className="text-xs text-slate-400 font-medium">{item.name}</p>
      <p className="text-sm font-bold text-white mt-0.5">
        {item.value.toLocaleString('vi-VN')} đ
      </p>
    </div>
  )
}

export function RevenueDistributionChart({ breakdown }: { breakdown: RevenueBreakdown }) {
  const chartData = [
    { key: 'roomPrice', name: LABELS.roomPrice, value: breakdown.roomPrice, color: COLORS.roomPrice },
    { key: 'electricCost', name: LABELS.electricCost, value: breakdown.electricCost, color: COLORS.electricCost },
    { key: 'waterCost', name: LABELS.waterCost, value: breakdown.waterCost, color: COLORS.waterCost },
    { key: 'serviceCost', name: LABELS.serviceCost, value: breakdown.serviceCost, color: COLORS.serviceCost },
    { key: 'repairCost', name: LABELS.repairCost, value: breakdown.repairCost, color: COLORS.repairCost },
  ].filter((item) => item.value > 0)

  const totalRevenue = chartData.reduce((s, item) => s + item.value, 0)

  return (
    <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-indigo-600" />
          Cơ cấu Nguồn thu
        </CardTitle>
        <p className="text-xs text-slate-500">Tỷ trọng các khoản thu trong kỳ</p>
      </CardHeader>

      <CardContent>
        {totalRevenue === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">
            Chưa có phát sinh doanh thu trong kỳ này
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 h-[280px]">
            {/* Donut Chart */}
            <div className="relative h-[220px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<DonutTooltip />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Tổng thu
                </span>
                <span className="text-base font-extrabold text-slate-800">
                  {(totalRevenue / 1_000_000).toFixed(1)}M
                </span>
              </div>
            </div>

            {/* Legend & Breakdown stats */}
            <div className="space-y-2.5 pr-2">
              {chartData.map((item) => {
                const percent = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
