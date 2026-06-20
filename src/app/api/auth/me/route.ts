import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const { data: profile } = await auth.supabase!
      .from('users')
      .select('role, branch_id, full_name, phone')
      .eq('id', auth.dbUserId!)
      .single()

    return NextResponse.json({
      success: true,
      user: {
        id: auth.dbUserId,
        role: profile?.role ?? auth.role,
        branch_id: profile?.branch_id,
        full_name: profile?.full_name,
        phone: profile?.phone,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
