'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DoorOpen, CheckCircle2, AlertTriangle, Sparkles, BedDouble } from 'lucide-react'
import Link from 'next/link'

export interface RoomDistributionData {
  total: number
  occupied: number
  available: number
  maintenance: number
  cleaning: number
  floors?: { floor: number; total: number; occupied: number }[]
}

export function RoomStatusDistribution({ data }: { data: RoomDistributionData }) {
  const occPercent = data.total > 0 ? (data.occupied / data.total) * 100 : 0
  const availPercent = data.total > 0 ? (data.available / data.total) * 100 : 0
  const maintPercent = data.total > 0 ? (data.maintenance / data.total) * 100 : 0
  const cleanPercent = data.total > 0 ? (data.cleaning / data.total) * 100 : 0

  const items = [
    {
      title: 'Đang thuê',
      count: data.occupied,
      percent: occPercent,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      bgLight: 'bg-indigo-50',
      icon: BedDouble,
      href: '/rooms?status=occupied',
    },
    {
      title: 'Trống sẵn sàng',
      count: data.available,
      percent: availPercent,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
      icon: CheckCircle2,
      href: '/rooms?status=available',
    },
    {
      title: 'Đang sửa chữa',
      count: data.maintenance,
      percent: maintPercent,
      color: 'bg-rose-500',
      textColor: 'text-rose-600',
      bgLight: 'bg-rose-50',
      icon: AlertTriangle,
      href: '/rooms?status=maintenance',
    },
    {
      title: 'Chờ dọn phòng',
      count: data.cleaning,
      percent: cleanPercent,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgLight: 'bg-amber-50',
      icon: Sparkles,
      href: '/rooms?status=cleaning',
    },
  ]

  return (
    <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-blue-600" />
            Trạng thái & Phân bổ Phòng
          </CardTitle>
          <p className="text-xs text-slate-500">
            Tổng cộng <span className="font-semibold text-slate-700">{data.total} phòng</span> đang quản lý
          </p>
        </div>
        <Link
          href="/rooms"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          Xem tất cả →
        </Link>
      </CardHeader>

      <CardContent className="space-y-5 pt-2">
        {/* Multi-segment Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5">
            {data.occupied > 0 && (
              <div
                className="h-full bg-indigo-500 rounded-l-full transition-all duration-500"
                style={{ width: `${occPercent}%` }}
                title={`Đang thuê: ${data.occupied} phòng (${occPercent.toFixed(0)}%)`}
              />
            )}
            {data.available > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${availPercent}%` }}
                title={`Trống: ${data.available} phòng (${availPercent.toFixed(0)}%)`}
              />
            )}
            {data.maintenance > 0 && (
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${maintPercent}%` }}
                title={`Bảo trì: ${data.maintenance} phòng (${maintPercent.toFixed(0)}%)`}
              />
            )}
            {data.cleaning > 0 && (
              <div
                className="h-full bg-amber-500 rounded-r-full transition-all duration-500"
                style={{ width: `${cleanPercent}%` }}
                title={`Chờ dọn: ${data.cleaning} phòng (${cleanPercent.toFixed(0)}%)`}
              />
            )}
          </div>
        </div>

        {/* 4 Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.title}
                href={item.href}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 group-hover:text-slate-900 transition-colors truncate">
                    {item.title}
                  </span>
                  <div className={`p-1.5 rounded-lg ${item.bgLight} ${item.textColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-900">
                    {item.count}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({item.percent.toFixed(0)}%)
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
