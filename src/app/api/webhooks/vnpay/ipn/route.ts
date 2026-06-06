import { NextResponse, type NextRequest } from 'next/server'
import { verifyVNPaySignature } from '@/lib/vnpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmInvoicePaymentAndNotify } from '@/lib/invoice-payment-confirmation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vnpParams: Record<string, string> = {}

    searchParams.forEach((value, key) => {
      vnpParams[key] = value
    })

    if (!verifyVNPaySignature({ ...vnpParams })) {
      return NextResponse.json({ RspCode: '97', Message: 'Checksum failed' }, { status: 200 })
    }

    const orderId = vnpParams['vnp_TxnRef']
    const rspCode = vnpParams['vnp_ResponseCode']

    if (rspCode !== '00') {
      return NextResponse.json({ RspCode: '00', Message: 'Success with non-00 status' }, { status: 200 })
    }

    const supabase = createAdminClient()
    const vnpAmount = Number(vnpParams['vnp_Amount']) / 100
    const result = await confirmInvoicePaymentAndNotify(supabase, orderId, vnpAmount)

    if (!result.success) {
      if (result.error.includes('Không tìm thấy hóa đơn')) {
        return NextResponse.json({ RspCode: '01', Message: 'Order not found' }, { status: 200 })
      }

      if (result.error.includes('không khớp')) {
        return NextResponse.json({ RspCode: '04', Message: 'invalid amount' }, { status: 200 })
      }

      throw new Error(result.error)
    }

    return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' }, { status: 200 })
  } catch (error: unknown) {
    console.error('VNPay IPN Error:', error)
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' }, { status: 200 })
  }
}
