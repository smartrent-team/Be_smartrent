import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { new_password } = body

    if (!new_password || new_password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 })
    }

    // supabase instance here already has the user's JWT so it can update their password
    const { error } = await auth.supabase!.auth.updateUser({
      password: new_password
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
