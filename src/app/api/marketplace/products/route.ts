import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { formatMarketplaceProduct } from '@/lib/marketplace'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchIdParam = searchParams.get('branch_id')
    const statusParam = searchParams.get('status')
    const supabase = auth.supabase!

    let query = supabase
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
      .order('created_at', { ascending: false })

    if (auth.role === 'manager') {
      if (!auth.branchId && !branchIdParam) {
        return NextResponse.json({ error: 'Missing branch_id' }, { status: 400 })
      }
      query = query.eq('branch_id', branchIdParam || auth.branchId)
      if (statusParam) query = query.eq('status', statusParam)
    } else if (auth.role === 'tenant') {
      if (!auth.branchId && !branchIdParam) {
        return NextResponse.json({ error: 'Missing branch_id' }, { status: 400 })
      }
      query = query.eq('branch_id', branchIdParam || auth.branchId)
      query = query.eq('status', 'active')
    } else {
      if (branchIdParam) query = query.eq('branch_id', branchIdParam)
      if (statusParam) query = query.eq('status', statusParam)
      else query = query.eq('status', 'active')
    }

    const { data, error } = await query
    if (error) throw error

    const products = (data ?? []).map((post) => formatMarketplaceProduct(post))

    return NextResponse.json({ success: true, data: products })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 })
  }
}
