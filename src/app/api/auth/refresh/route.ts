import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return NextResponse.json({ error: 'Thiếu refresh_token' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase.auth.refreshSession({
      refresh_token,
    })

    if (error || !data.session) {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' }, { status: 401 })
    }

    // Lấy profile để trả về role
    const { data: profile } = await adminSupabase
      .from('users')
      .select('role, branch_id, full_name, phone')
      .eq('email', data.user?.email ?? '')
      .single()

    return NextResponse.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user?.id,
        phone: profile?.phone,
        role: profile?.role,
        branch_id: profile?.branch_id,
        full_name: profile?.full_name,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
