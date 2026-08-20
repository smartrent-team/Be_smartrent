'use client'

import { Card, CardContent } from "@/components/ui/card"
import {
  Users,
  DoorOpen,
  AlertCircle,
  ShieldAlert,
  Building2,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

export interface KPIStats {
  activeTenantsCount: number
  activeContractsCount: number
  
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  maintenanceRooms: number
  cleaningRooms: number
  occupancyRate: number
  
  totalDebt: number
  unpaidInvoicesCount: number
  overdueInvoicesCount: number
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} tỷ`
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`
  }
  return amount.toLocaleString('vi-VN')
}

export function DashboardKPIs({ stats }: { stats: KPIStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Số cư dân */}
      <Link href="/tenants" className="group block">
        <Card className="relative overflow-hidden border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Số cư dân
              </span>
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.activeTenantsCount}
              </span>
              <span className="text-xs font-medium text-slate-500">cư dân đang thuê</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-600 font-medium">
                {stats.activeContractsCount} hợp đồng đang hiệu lực
              </span>
              <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                Đang cư trú
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 2. Tổng số phòng */}
      <Link href="/rooms" className="group block">
        <Card className="relative overflow-hidden border border-slate-200/80 bg-white hover:border-teal-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Số phòng
              </span>
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-110 group-hover:bg-teal-100 transition-all duration-300">
                <DoorOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.totalRooms}
              </span>
              <span className="text-xs font-medium text-slate-500">
                phòng ({stats.occupiedRooms} đang thuê - {stats.occupancyRate.toFixed(0)}%)
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {stats.availableRooms} phòng trống
              </span>
              {(stats.maintenanceRooms > 0 || stats.cleaningRooms > 0) && (
                <span className="text-amber-600 font-medium">
                  {stats.maintenanceRooms + stats.cleaningRooms} đang sửa/dọn
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 3. Công nợ chưa thu */}
      <Link href="/invoices?status=unpaid" className="group block">
        <Card className="relative overflow-hidden border border-slate-200/80 bg-white hover:border-rose-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Công nợ chưa thu
              </span>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 group-hover:bg-rose-100 transition-all duration-300">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatMoney(stats.totalDebt)}
                <span className="text-sm font-normal text-slate-500 ml-1">đ</span>
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-600 font-medium">
                {stats.unpaidInvoicesCount} hóa đơn chờ
              </span>
              {stats.overdueInvoicesCount > 0 ? (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {stats.overdueInvoicesCount} quá hạn
                </span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Không có quá hạn
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
