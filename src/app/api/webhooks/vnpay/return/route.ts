import { NextResponse, type NextRequest } from 'next/server'
import { verifyVNPaySignature } from '@/lib/vnpay'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const vnp_Params: Record<string, string> = {}

  searchParams.forEach((value, key) => {
    vnp_Params[key] = value
  })

  const isVerified = verifyVNPaySignature({ ...vnp_Params })

  if (isVerified) {
    if (vnp_Params['vnp_ResponseCode'] === '00') {
      const orderId = vnp_Params['vnp_TxnRef']
      const supabase = createAdminClient()

      if (orderId.startsWith('SAAS_')) {
        // Handle SaaS Subscription Payment
        const { data: tx } = await supabase
          .from('saas_transactions')
          .select('*')
          .eq('order_id', orderId)
          .single()

        if (tx && tx.status !== 'paid') {
          // Update transaction
          await supabase
            .from('saas_transactions')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', tx.id)

          // Update organization subscription
          const { data: org } = await supabase
            .from('organizations')
            .select('subscription_end_date')
            .eq('id', tx.organization_id)
            .single()

          const now = new Date()
          let currentEndDate = org?.subscription_end_date ? new Date(org.subscription_end_date) : now
          if (currentEndDate < now) {
            currentEndDate = now
          }
          currentEndDate.setDate(currentEndDate.getDate() + 30)

          await supabase
            .from('organizations')
            .update({ subscription_end_date: currentEndDate.toISOString() })
            .eq('id', tx.organization_id)
        }

        return new NextResponse(buildHtmlPage('Thanh toán thành công', 'Cảm ơn bạn! Gói cước của bạn đã được gia hạn thêm 30 ngày. Vui lòng đóng trang này và quay lại ứng dụng.', 'success'), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      } else {
        // Fallback: Handle Tenant Invoice Payment (if any)
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, payment_status, total_amount')
          .eq('payment_link_id', orderId)
          .single()

        if (invoice && invoice.payment_status !== 'paid') {
          const vnpAmount = Number(vnp_Params['vnp_Amount']) / 100
          if (vnpAmount === Number(invoice.total_amount)) {
            await supabase
              .from('invoices')
              .update({
                payment_status: 'paid',
                paid_at: new Date().toISOString(),
              })
              .eq('id', invoice.id)
          }
        }
        return new NextResponse(buildHtmlPage('Thanh toán hóa đơn thành công', 'Hóa đơn đã được gạch nợ. Bạn có thể quay lại ứng dụng.', 'success'), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    } else {
      return new NextResponse(buildHtmlPage('Thanh toán thất bại', 'Giao dịch đã bị hủy hoặc có lỗi xảy ra. Vui lòng thử lại.', 'error'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } else {
    return new NextResponse(buildHtmlPage('Lỗi xác thực', 'Chữ ký VNPay không hợp lệ. Giao dịch bị từ chối.', 'error'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}

function buildHtmlPage(title: string, message: string, type: 'success' | 'error') {
  const color = type === 'success' ? '#10b981' : '#ef4444'
  const icon = type === 'success' 
    ? `<svg class="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`
    : `<svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - SmartRent</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 flex items-center justify-center min-h-screen p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div class="mb-6">${icon}</div>
        <h1 class="text-2xl font-bold text-white mb-4">${title}</h1>
        <p class="text-slate-400 mb-8 leading-relaxed">${message}</p>
        <a href="smartrent://payment-result" class="inline-block w-full py-3 px-6 rounded-xl font-medium text-white transition-colors" style="background-color: ${color}; opacity: 0.9" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.9'">
          Quay lại Ứng dụng
        </a>
      </div>
    </body>
    </html>
  `
}
