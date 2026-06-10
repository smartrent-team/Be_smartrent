import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { buildVNPayUrl } from '@/infrastructure/vnpay'
import { createAdminClient } from '@/infrastructure/supabase/admin'

export async function POST(request: Request) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Chỉ Super Admin mới được mua gói cước' }, { status: 403 })
    }

    const { planType, amount } = await request.json()

    if (planType !== 'pro' || amount !== 499000) {
      return NextResponse.json({ error: 'Gói cước không hợp lệ' }, { status: 400 })
    }

    // Lấy organization_id của user
    const supabase = auth.supabase!
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', auth.dbUserId)
      .single()

    if (userErr || !userData?.organization_id) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tổ chức' }, { status: 404 })
    }

    const orgId = userData.organization_id

    // Tạo order_id
    const orderId = `SUB_${orgId}_${new Date().getTime()}`

    // Tạo transaction
    const adminSupabase = createAdminClient()
    const { error: txErr } = await adminSupabase
      .from('saas_transactions')
      .insert({
        organization_id: orgId,
        order_id: orderId,
        amount: amount,
        status: 'pending'
      })

    if (txErr) {
      console.error('Failed to create tx', txErr)
      return NextResponse.json({ error: 'Lỗi khởi tạo giao dịch' }, { status: 500 })
    }

    // IP của người dùng thực tế sẽ được proxy pass nếu qua nginx, tạm dùng 127.0.0.1
    const checkoutUrl = buildVNPayUrl({
      orderId: orderId,
      amount: amount,
      orderInfo: `Thanh Toan Goi Cuoc SaaS ${planType}`,
      ipAddr: '127.0.0.1'
    })

    return NextResponse.json({
      success: true,
      checkoutUrl
    })
  } catch (error: unknown) {
    console.error('POST saas/subscribe error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
