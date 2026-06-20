import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function RecentActivities() {
  interface InvoiceData {
    id: string;
    invoice_code?: string;
    total_amount?: number;
    payment_status?: string;
    issued_at?: string;
    room?: { room_code: string };
    tenant?: { user?: { full_name: string } };
  }

  const supabase = createAdminClient()

  const { data: recentInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_code, total_amount, paid_at, room:rooms(room_code), tenant:tenants(user:users(full_name))')
    .eq('payment_status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(5)

  return (
    <Card className="col-span-4 hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
        <CardDescription>Các giao dịch và sự kiện mới nhất.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recentInvoices && recentInvoices.length > 0 ? (recentInvoices as unknown as InvoiceData[]).map((inv) => (
            <Link href="/invoices?status=paid" key={inv.id} className="block group">
              <div className="flex items-center gap-4 p-2 -mx-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">Thanh toán phòng {inv.room?.room_code}</p>
                  <p className="text-sm text-muted-foreground">{inv.tenant?.user?.full_name || 'Khách vãng lai'} thanh toán hoá đơn {inv.invoice_code}</p>
                </div>
                <div className="font-medium text-green-600">+{inv.total_amount?.toLocaleString('vi-VN')}đ</div>
              </div>
            </Link>
          )) : (
            <p className="text-sm text-muted-foreground">Chưa có giao dịch nào gần đây.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
