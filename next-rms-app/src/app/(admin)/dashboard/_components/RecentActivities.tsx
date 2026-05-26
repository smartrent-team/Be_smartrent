import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function RecentActivities() {
  interface InvoiceData {
    id: string;
    invoice_code?: string;
    total_amount?: number;
    payment_status?: string;
    issued_at?: string;
    room?: { room_number: string };
    tenant?: { user?: { full_name: string } };
  }

  const supabase = await createClient()

  const { data: recentInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_code, total_amount, paid_at, room:rooms(room_number), tenant:tenants(user:users(full_name))')
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
            <div key={inv.id} className="flex items-center gap-4 group">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Thanh toán phòng {inv.room?.room_number}</p>
                <p className="text-sm text-muted-foreground">{inv.tenant?.user?.full_name || 'Khách vãng lai'} thanh toán hoá đơn {inv.invoice_code}</p>
              </div>
              <div className="font-medium text-green-600">+{inv.total_amount?.toLocaleString('vi-VN')}đ</div>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">Chưa có giao dịch nào gần đây.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
