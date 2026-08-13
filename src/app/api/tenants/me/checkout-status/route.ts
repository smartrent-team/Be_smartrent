import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.dbUserId) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!
    
    // 1. Get tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', auth.dbUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ cư dân' }, { status: 404 })
    }

    // 2. Lấy checkout request mới nhất
    const { data: request, error: reqErr } = await supabase
      .from('checkout_requests')
      .select(`
        *,
        checkout_settlements (*)
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (reqErr || !request) {
      return NextResponse.json({ error: 'Không tìm thấy tiến trình trả phòng' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: request
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[checkout status] Lỗi:', msg)
    return NextResponse.json(
      { error: 'Lỗi hệ thống.' },
      { status: 500 }
    )
  }
}
