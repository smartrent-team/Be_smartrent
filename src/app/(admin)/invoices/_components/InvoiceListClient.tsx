'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { InvoiceActions } from './InvoiceActions'

export interface InvoiceRow {
  id: number
  code: string
  room: string
  tenant: string
  date: string
  dueDate: string
  amount: number
  status: string
}

export default function InvoiceListClient({ initialInvoices }: { initialInvoices: InvoiceRow[] }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const router = useRouter()
  const supabase = createClient()

  const refresh = useCallback(() => {
    router.refresh()
    setLastUpdated(new Date())
  }, [router])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.success('Có hóa đơn mới được tạo!')
          refresh()
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new
          setInvoices(prev => prev.map(inv =>
            inv.id === updated.id
              ? { ...inv, status: updated.payment_status, amount: updated.total_amount }
              : inv
          ))
          setLastUpdated(new Date())
          if (updated.payment_status === 'paid') {
            toast.success(`Hóa đơn #${updated.invoice_code || updated.id} đã được thanh toán!`)
          }
        } else if (payload.eventType === 'DELETE') {
          setInvoices(prev => prev.filter(inv => inv.id !== payload.old.id))
          setLastUpdated(new Date())
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, refresh])

  return (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <RefreshCw className="h-3 w-3" />
        <span>Cập nhật lần cuối: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
        <span className="ml-1 w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" title="Đang kết nối realtime" />
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã HĐ</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Khách thuê</TableHead>
              <TableHead>Ngày lập</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length > 0 ? invoices.map((inv) => (
              <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-medium">
                  <Link href={`/invoices/${inv.id}`} className="text-teal-600 hover:text-teal-800 hover:underline font-semibold">
                    {inv.code}
                  </Link>
                </TableCell>
                <TableCell>P.{inv.room}</TableCell>
                <TableCell>{inv.tenant}</TableCell>
                <TableCell>{inv.date}</TableCell>
                <TableCell className="font-semibold">{inv.amount.toLocaleString()}đ</TableCell>
                <TableCell>
                  {inv.status === 'paid'    && <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/>Đã thu</Badge>}
                  {inv.status === 'unpaid'  && <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"><Clock className="w-3 h-3 mr-1"/>Chưa thu</Badge>}
                  {inv.status === 'partial' && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="w-3 h-3 mr-1"/>Thiếu</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/invoices/${inv.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-teal-50" title="Xem chi tiết">
                        <Eye className="h-3.5 w-3.5 text-teal-600" />
                      </Button>
                    </Link>
                    <InvoiceActions invoice={inv} />
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Không có dữ liệu hoá đơn</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
