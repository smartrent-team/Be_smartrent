import { NextResponse, type NextRequest } from 'next/server'
import { verifyVNPaySignature } from '@/lib/vnpay'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const vnp_Params: Record<string, string> = {}

  searchParams.forEach((value, key) => {
    vnp_Params[key] = value
  })

  const isVerified = verifyVNPaySignature({ ...vnp_Params })

  // Chuyển hướng người dùng về trang thông báo
  // Có thể tuỳ biến UI trang này sau ở /payment-result
  if (isVerified) {
    if (vnp_Params['vnp_ResponseCode'] === '00') {
      return NextResponse.redirect(new URL('/payment-success', request.url))
    } else {
      return NextResponse.redirect(new URL('/payment-cancel', request.url))
    }
  } else {
    return NextResponse.redirect(new URL('/payment-cancel?error=invalid_signature', request.url))
  }
}
