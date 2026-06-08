import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(req: Request) {
  try {
    const { user, supabase, organizationId, role } = await verifyRole()
    
    if (!user || (role !== 'super_admin' && role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    const { identity_number, phone } = await req.json()

    if (!identity_number && !phone) {
      return NextResponse.json({ error: 'Require identity_number or phone to check credit.' }, { status: 400 })
    }

    // Xây dựng query kiểm tra các đánh giá từ 2 sao trở xuống
    let query = supabase
      .from('tenant_ratings')
      .select('rating, comment, created_at')
      .lte('rating', 2)

    if (identity_number && phone) {
      query = query.or(`identity_number.eq.${identity_number},phone.eq.${phone}`)
    } else if (identity_number) {
      query = query.eq('identity_number', identity_number)
    } else if (phone) {
      query = query.eq('phone', phone)
    }

    // Ngăn tổ chức tự thấy cảnh báo của chính mình nếu không cần thiết
    // Tuy nhiên, ở đây ta hiển thị tất cả cảnh báo xấu để họ cẩn thận
    const { data: badRatings, error: err } = await query

    if (err) {
      console.error('Check credit error:', err)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (badRatings && badRatings.length > 0) {
      return NextResponse.json({
        hasBadCredit: true,
        warnings: badRatings.map(r => ({
          rating: r.rating,
          comment: r.comment,
          date: r.created_at
        }))
      })
    }

    return NextResponse.json({ hasBadCredit: false })

  } catch (error) {
    console.error('API /tenants/check-credit error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
