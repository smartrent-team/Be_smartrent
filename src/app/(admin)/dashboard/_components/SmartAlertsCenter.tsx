'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CalendarClock,
  Wrench,
  ChevronRight,
  User,
  Clock,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'

export interface ExpiringContractItem {
  id: number
  contractCode?: string
  roomCode: string
  branchName?: string
  tenantName: string
  phone?: string
  endDate: string
  daysRemaining: number
}

export interface UrgentTicketItem {
  id: number
  title: string
  roomCode: string
  branchName?: string
  priority: string
  createdAt: string
}

export function SmartAlertsCenter({
  expiringContracts,
  urgentTickets,
}: {
  expiringContracts: ExpiringContractItem[]
  urgentTickets: UrgentTicketItem[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Hợp đồng sắp hết hạn */}
      <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Hợp đồng sắp hết hạn (30 ngày tới)
              </CardTitle>
              <p className="text-xs text-slate-500">
                {expiringContracts.length > 0
                  ? `Có ${expiringContracts.length} hợp đồng cần liên hệ gia hạn/trả phòng`
                  : 'Không có hợp đồng nào sắp hết hạn trong 30 ngày'}
              </p>
            </div>
          </div>
          <Link
            href="/tenants"
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline shrink-0"
          >
            Quản lý →
          </Link>
        </CardHeader>

        <CardContent className="space-y-2.5 pt-1">
          {expiringContracts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500/60" />
              <span>Tất cả hợp đồng hiện tại đều còn hạn an toàn</span>
            </div>
          ) : (
            expiringContracts.slice(0, 5).map((contract) => {
              const isUrgent = contract.daysRemaining <= 7
              const isWarning = contract.daysRemaining <= 15

              const badgeColor = isUrgent
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : isWarning
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-blue-100 text-blue-700 border-blue-200'

              return (
                <Link
                  key={contract.id}
                  href={`/tenants`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                      {contract.roomCode}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {contract.tenantName}
                        </span>
                        {contract.branchName && (
                          <span className="text-[10px] text-slate-400 truncate">
                            • {contract.branchName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Hết hạn:{' '}
                          {new Date(contract.endDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
                    >
                      {contract.daysRemaining <= 0
                        ? 'Hôm nay'
                        : `Còn ${contract.daysRemaining} ngày`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* 2. Sự cố bảo trì cần xử lý */}
      <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Sự cố bảo trì chờ xử lý
              </CardTitle>
              <p className="text-xs text-slate-500">
                {urgentTickets.length > 0
                  ? `Có ${urgentTickets.length} sự cố kỹ thuật cần theo dõi tiến độ`
                  : 'Tuyệt vời! Không có sự cố nào đang tồn đọng'}
              </p>
            </div>
          </div>
          <Link
            href="/tickets"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline shrink-0"
          >
            Tất cả sự cố →
          </Link>
        </CardHeader>

        <CardContent className="space-y-2.5 pt-1">
          {urgentTickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500/60" />
              <span>Toàn bộ hệ thống kỹ thuật đang hoạt động ổn định</span>
            </div>
          ) : (
            urgentTickets.slice(0, 5).map((ticket) => {
              const isHigh = ticket.priority === 'high' || ticket.priority === 'urgent'

              return (
                <Link
                  key={ticket.id}
                  href="/tickets"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isHigh
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {ticket.roomCode}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-900 truncate">
                        {ticket.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {ticket.branchName && (
                          <span className="truncate">{ticket.branchName} •</span>
                        )}
                        <span>
                          {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isHigh ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                        Khẩn cấp
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Bình thường
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
