type MarketplacePostRow = {
  id: number
  branch_id: number | null
  title: string
  description: string | null
  price: number
  images: string[] | null
  status: string
  created_at: string
  tenants?: unknown
}

type TenantRelation = {
  id: number
  users?: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function formatMarketplaceProduct(post: MarketplacePostRow) {
  const tenantData = unwrapRelation(post.tenants as TenantRelation | TenantRelation[] | null)
  const userData = unwrapRelation(tenantData?.users ?? null)

  return {
    id: post.id,
    title: post.title,
    name: post.title,
    price: post.price,
    imageUrl: Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : null,
    images: post.images ?? [],
    condition: 'used',
    description: post.description ?? '',
    sellerId: userData?.id ?? null,
    sellerName: userData?.full_name ?? 'Người bán',
    status: post.status,
    branchId: post.branch_id,
    createdAt: post.created_at,
  }
}
