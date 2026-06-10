import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildVNPayUrl } from '@/infrastructure/vnpay'
import { z } from 'zod'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const createPaymentSchema = z.object({
  organizationId: z.number(),
  amount: z.number().min(10000, 'Số tiền phải từ 10,000 VND'),
  planName: z.string().default('Gói Dịch Vụ')
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const token = authHeader.replace('Bearer ', '')
    
    const { data: authData, error: authError } = await adminSupabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: parsed.error.format() }, { status: 400 })
    }
    const { organizationId, amount, planName } = parsed.data

    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('role, organization_id')
      .eq('id', authData.user.id)
      .single()

    if (userError || !userData || userData.organization_id !== organizationId || userData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Bạn không có quyền thanh toán cho tổ chức này' }, { status: 403 })
    }

    const orderId = `SAAS_${Date.now()}_${organizationId}`
    
    const { error: insertError } = await adminSupabase
      .from('saas_transactions')
      .insert({
        organization_id: organizationId,
        order_id: orderId,
        amount: amount,
        status: 'pending'
      })

    if (insertError) {
      console.error('Lỗi khi tạo transaction:', insertError)
      return NextResponse.json({ error: 'Không thể tạo phiên thanh toán' }, { status: 500 })
    }

    const ipAddr = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    
    const paymentUrl = buildVNPayUrl({
      orderId: orderId,
      amount: amount,
      orderInfo: `Thanh toan ${planName} cho to chuc ${organizationId}`,
      ipAddr: ipAddr.split(',')[0].trim()
    })

    return NextResponse.json({
      checkoutUrl: paymentUrl,
      orderId: orderId
    })

  } catch (err: unknown) {
    console.error('Payment create API error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
