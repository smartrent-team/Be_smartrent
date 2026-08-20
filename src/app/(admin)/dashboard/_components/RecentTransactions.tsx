'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, DollarSign, ArrowUpRight, Receipt } from 'lucide-react'
import Link from 'next/link'

export interface RecentTransactionItem {
  id: number
  invoiceCode: string
  roomCode: string
  branchName?: string
  tenantName: string
  totalAmount: number
  paidAt: string
}

export function RecentTransactions({ transactions }: { transactions: RecentTransactionItem[] }) {
  return (
    <Card className="border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Giao dịch thu tiền gần nhất
            </CardTitle>
            <p className="text-xs text-slate-500">Các hóa đơn thanh toán thành công mới nhất</p>
          </div>
        </div>
        <Link
          href="/invoices?status=paid"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Xem tất cả →
        </Link>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-1">
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Chưa có giao dịch thanh toán nào được ghi nhận
          </div>
        ) : (
          transactions.slice(0, 5).map((tx) => (
            <Link
              key={tx.id}
              href={`/invoices/${tx.id}`}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      Phòng {tx.roomCode}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      • {tx.tenantName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>Mã: {tx.invoiceCode}</span>
                    {tx.paidAt && (
                      <span>
                        • {new Date(tx.paidAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                        {new Date(tx.paidAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-emerald-600 block">
                  +{tx.totalAmount.toLocaleString('vi-VN')}đ
                </span>
                <span className="text-[10px] text-emerald-600/80 font-medium inline-flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Đã thu
                </span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
