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

      // Update invoice to paid if not already updated by IPN
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

      return NextResponse.redirect(new URL('/payment-success', request.url))
    } else {
      return NextResponse.redirect(new URL('/payment-cancel', request.url))
    }
  } else {
    return NextResponse.redirect(new URL('/payment-cancel?error=invalid_signature', request.url))
  }
}
