import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role !== 'tenant' && auth.role !== 'manager') {
      return NextResponse.json({
        success: true,
        registered: false,
        message: 'Đăng ký token thiết bị chỉ dùng cho cư dân và quản lý',
      })
    }

    const body = await request.json().catch(() => ({}))
    const token = String(body?.token ?? '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Thiếu token thiết bị' }, { status: 400 })
    }

    const supabase = auth.supabase!

    await supabase
      .from('device_tokens')
      .delete()
      .eq('token', token)

    const deviceTokenRecord: Record<string, unknown> = {
      token,
      user_id: auth.dbUserId,
    }

    if (auth.role === 'tenant') {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', auth.dbUserId)
        .is('move_out_date', null)
        .maybeSingle()

      if (tenantError || !tenant) {
        return NextResponse.json({ error: 'Không tìm thấy hồ sơ cư dân' }, { status: 404 })
      }

      deviceTokenRecord.tenant_id = tenant.id
    }

    const { error: insertError } = await supabase
      .from('device_tokens')
      .insert(deviceTokenRecord)

    if (insertError) throw insertError

    return NextResponse.json({ success: true, registered: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
