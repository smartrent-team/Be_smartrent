import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import {
  buildConversationFilter,
  getTenantIdByUserId,
  getUnreadCount,
  resolveOtherParty,
  type ConversationRow,
} from '@/lib/chat'
import { createConversationSchema, formatZodError } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!
    const tenantId = await getTenantIdByUserId(supabase, auth.dbUserId)
    const filter = buildConversationFilter(auth.dbUserId, auth.role, tenantId)

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .or(filter)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })

    if (error) throw error

    const rows = (conversations ?? []) as ConversationRow[]
    const formatted = await Promise.all(
      rows.map(async (conversation) => {
        const otherParty = await resolveOtherParty(supabase, conversation, auth.dbUserId)
        const unreadCount = await getUnreadCount(supabase, conversation.id, auth.dbUserId)

        return {
          id: conversation.id,
          type: conversation.type,
          productId: conversation.product_id,
          tenantId: conversation.tenant_id,
          managerId: conversation.manager_id,
          sellerId: conversation.seller_id,
          buyerId: conversation.buyer_id,
          lastMessage: conversation.last_message,
          lastMessageAt: conversation.last_message_at,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
          unreadCount,
          otherParty: otherParty
            ? {
                id: otherParty.id,
                fullName: otherParty.full_name,
                phone: otherParty.phone,
                role: otherParty.role,
              }
            : null,
        }
      })
    )

    return NextResponse.json({ success: true, data: formatted })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = createConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { type, productId, receiverId } = parsed.data
    const supabase = auth.supabase!

    if (type === 'PRODUCT') {
      if (!productId) {
        return NextResponse.json({ error: 'Thiếu productId cho cuộc trò chuyện sản phẩm' }, { status: 400 })
      }

      const { data: product, error: productError } = await supabase
        .from('marketplace_posts')
        .select(`
          id,
          tenant_id,
          tenants (
            user_id
          )
        `)
        .eq('id', productId)
        .maybeSingle()

      if (productError) throw productError
      if (!product) {
        return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 })
      }

      const tenantData = Array.isArray(product.tenants) ? product.tenants[0] : product.tenants
      const sellerId = tenantData?.user_id as string | undefined
      if (!sellerId) {
        return NextResponse.json({ error: 'Sản phẩm chưa có người bán' }, { status: 400 })
      }

      if (receiverId !== sellerId) {
        return NextResponse.json({ error: 'receiverId phải là người bán sản phẩm' }, { status: 400 })
      }

      if (sellerId === auth.dbUserId) {
        return NextResponse.json({ error: 'Không thể tạo cuộc trò chuyện với chính mình' }, { status: 400 })
      }

      const buyerTenantId = await getTenantIdByUserId(supabase, auth.dbUserId)

      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('type', 'PRODUCT')
        .eq('product_id', productId)
        .eq('buyer_id', auth.dbUserId)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ success: true, data: existing, created: false })
      }

      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'PRODUCT',
          product_id: productId,
          tenant_id: buyerTenantId,
          seller_id: sellerId,
          buyer_id: auth.dbUserId,
        })
        .select('*')
        .single()

      if (createError) throw createError
      return NextResponse.json({ success: true, data: created, created: true }, { status: 201 })
    }

    if (auth.role !== 'tenant') {
      return NextResponse.json({ error: 'Chỉ cư dân mới có thể nhắn tin với quản lý' }, { status: 403 })
    }

    const { data: manager, error: managerError } = await supabase
      .from('users')
      .select('id, role, branch_id')
      .eq('id', receiverId)
      .maybeSingle()

    if (managerError) throw managerError
    if (!manager || (manager.role !== 'manager' && manager.role !== 'super_admin')) {
      return NextResponse.json({ error: 'receiverId phải là quản lý hợp lệ' }, { status: 400 })
    }

    const tenantId = await getTenantIdByUserId(supabase, auth.dbUserId)
    if (!tenantId) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ cư dân' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('type', 'MANAGER')
      .eq('tenant_id', tenantId)
      .eq('manager_id', receiverId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, data: existing, created: false })
    }

    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        type: 'MANAGER',
        tenant_id: tenantId,
        manager_id: receiverId,
      })
      .select('*')
      .single()

    if (createError) throw createError
    return NextResponse.json({ success: true, data: created, created: true }, { status: 201 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
