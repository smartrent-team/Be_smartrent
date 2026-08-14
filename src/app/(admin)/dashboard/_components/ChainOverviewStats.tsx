import { Card, CardContent } from "@/components/ui/card"
import {
  Building2,
  TrendingUp,
  Percent,
  AlertCircle,
} from 'lucide-react'

interface ChainStats {
  totalRevenue: number
  avgOccupancyRate: number
  totalDebt: number
  totalBranches: number
  occupiedRooms?: number
  totalRooms?: number
}

function formatMoney(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toLocaleString('vi-VN')
}

export default function ChainOverviewStats({ stats }: { stats: ChainStats }) {
  const items = [
    {
      title: 'Tổng chi nhánh',
      value: stats.totalBranches.toString(),
      icon: Building2,
      description: 'Đang hoạt động',
      gradient: 'from-teal-500 to-emerald-500',
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
    },
    {
      title: 'Doanh thu toàn chuỗi',
      value: `${formatMoney(stats.totalRevenue)}đ`,
      icon: TrendingUp,
      description: 'Tháng hiện tại',
      gradient: 'from-emerald-500 to-green-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Số phòng lấp đầy',
      value: stats.occupiedRooms !== undefined && stats.totalRooms !== undefined ? (
        <span className="flex items-baseline gap-1">
          {stats.occupiedRooms} <span className="text-base text-gray-500 font-medium">/ {stats.totalRooms}</span>
        </span>
      ) : `${stats.avgOccupancyRate}%`,
      icon: Percent,
      description: 'Phòng đã thuê / Tổng phòng',
      gradient: 'from-indigo-500 to-violet-500',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Công nợ toàn chuỗi',
      value: `${formatMoney(stats.totalDebt)}đ`,
      icon: AlertCircle,
      description: 'Chưa thanh toán',
      gradient: 'from-red-500 to-rose-500',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <Card
            key={i}
            className="overflow-hidden border-gray-100/80 bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
          >
            {/* Top accent bar */}
            <div className={`h-1 bg-gradient-to-r ${item.gradient}`} />
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl p-3 ${item.iconBg} transition-transform group-hover:scale-110 duration-300`}>
                <Icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {item.title}
                </p>
                <h3 className="text-xl font-bold text-gray-800 mt-0.5">
                  {item.value}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
