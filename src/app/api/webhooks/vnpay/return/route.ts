import { NextResponse, type NextRequest } from 'next/server'
import { verifyVNPaySignature } from '@/lib/vnpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmInvoicePaymentAndNotify } from '@/lib/invoice-payment-confirmation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const vnpParams: Record<string, string> = {}

  searchParams.forEach((value, key) => {
    vnpParams[key] = value
  })

  if (!verifyVNPaySignature({ ...vnpParams })) {
    return NextResponse.redirect(new URL('/payment-cancel?error=invalid_signature', request.url))
  }

  if (vnpParams['vnp_ResponseCode'] === '00') {
    const supabase = createAdminClient()
    const orderId = vnpParams['vnp_TxnRef']
    const vnpAmount = Number(vnpParams['vnp_Amount']) / 100
    const result = await confirmInvoicePaymentAndNotify(supabase, orderId, vnpAmount)

    if (!result.success) {
      console.error('VNPay return confirmation error:', result.error)
    }

    return NextResponse.redirect(new URL('/payment-success', request.url))
  }

  return NextResponse.redirect(new URL('/payment-cancel', request.url))
}
