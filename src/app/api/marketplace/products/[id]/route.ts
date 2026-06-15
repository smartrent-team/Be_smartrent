import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { formatMarketplaceProduct } from '@/lib/marketplace'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const { id } = await params
    const supabase = auth.supabase!

    const { data: post, error } = await supabase
      .from('marketplace_posts')
      .select(`
        id,
        branch_id,
        title,
        description,
        price,
        images,
        status,
        created_at,
        tenants (
          id,
          users (
            id,
            full_name
          )
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!post) {
      return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 })
    }

    if (auth.role === 'tenant') {
      const branchId = auth.branchId
      if (branchId && post.branch_id !== branchId) {
        return NextResponse.json({ error: 'Bạn không có quyền xem sản phẩm này' }, { status: 403 })
      }
      if (post.status !== 'active') {
        return NextResponse.json({ error: 'Sản phẩm không khả dụng' }, { status: 404 })
      }
    }

    if (auth.role === 'manager' && auth.branchId && post.branch_id !== auth.branchId) {
      return NextResponse.json({ error: 'Bạn không có quyền xem sản phẩm này' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: formatMarketplaceProduct(post) })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 })
  }
}
