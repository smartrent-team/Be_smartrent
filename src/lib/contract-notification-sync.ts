import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotification } from '@/lib/notification_dispatch'

type ContractRow = {
  id: number
  contract_code: string
  status: string
  end_date: string | null
  tenant_id: number
  room?: { room_code?: string; branch_id?: number } | { room_code?: string; branch_id?: number }[]
  tenant?: { user_id?: string } | { user_id?: string }[]
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

/**
 * Dedup cứng theo (user_id, related_id, type).
 * related_id được set = "contract:{contractId}" để tránh dedup theo nội dung chuỗi.
 */
async function notificationExistsForContract(
  supabase: SupabaseClient,
  userId: string,
  contractId: number,
  type: string
) {
  const relatedId = `contract:${contractId}`
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('related_id', relatedId)
    .eq('type', type)
    .maybeSingle()

  if (error) {
    console.error('Failed to check notification existence:', error)
    return false
  }
  return Boolean(data)
}

async function ensureContractNotification(
  supabase: SupabaseClient,
  userId: string,
  tenantId: number | null,
  contractId: number,
  title: string,
  body: string,
  type: string
) {
  const exists = await notificationExistsForContract(supabase, userId, contractId, type)
  if (exists) return false

  await dispatchNotification(supabase, { userId, tenantId }, {
    title,
    body,
    type,
    relatedId: `contract:${contractId}`,
  })
  return true
}

/**
 * Thông báo hợp đồng đã hết hạn.
 * Chạy cho tất cả hợp đồng active có end_date đã qua.
 */
export async function syncExpiredContractNotifications(
  supabase: SupabaseClient,
  context: {
    userId: string
    role: 'super_admin' | 'manager' | 'tenant' | 'system'
    branchId?: number | null
  }
) {
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_code,
      status,
      end_date,
      tenant_id,
      tenant:tenants(user_id),
      room:rooms(room_code, branch_id)
    `)
    .eq('status', 'active')
    .not('end_date', 'is', null)

  if (error) {
    console.error('Failed to load expired contracts:', error)
    return
  }

  for (const contractRaw of (contracts ?? []) as ContractRow[]) {
    const endDate = contractRaw.end_date ? new Date(contractRaw.end_date) : null
    if (!endDate || Number.isNaN(endDate.getTime())) continue

    const expiryBoundary = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23, 59, 59, 999
    )

    if (new Date() <= expiryBoundary) continue

    const tenant = firstItem(contractRaw.tenant)
    const room = firstItem(contractRaw.room)

    if (!tenant?.user_id || !room?.branch_id) continue

    if (context.role === 'tenant' && tenant.user_id !== context.userId) continue
    if (context.role === 'manager' && context.branchId != null && room.branch_id !== context.branchId) continue

    // Cập nhật trạng thái hợp đồng → expired
    if (contractRaw.status !== 'expired') {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'expired', end_date: contractRaw.end_date })
        .eq('id', contractRaw.id)
      if (updateError) console.error('Failed to mark contract expired:', updateError)
    }

    // Thông báo cho tenant
    await ensureContractNotification(
      supabase,
      tenant.user_id,
      contractRaw.tenant_id ?? null,
      contractRaw.id,
      'Hợp đồng đã hết hạn',
      `Hợp đồng ${contractRaw.contract_code} tại phòng ${room.room_code ?? contractRaw.id} đã hết hạn.`,
      'contract_expired'
    )

    // Thông báo cho manager + super_admin của chi nhánh
    let managerQuery = supabase.from('users').select('id')
    if (room.branch_id != null) {
      managerQuery = managerQuery.or(`role.eq.super_admin,and(role.eq.manager,branch_id.eq.${room.branch_id})`)
    } else {
      managerQuery = managerQuery.eq('role', 'super_admin')
    }

    const { data: managers, error: managersError } = await managerQuery
    if (managersError) {
      console.error('Failed to load branch managers:', managersError)
      continue
    }

    for (const manager of managers ?? []) {
      const managerId = (manager as { id?: string }).id
      if (!managerId) continue
      await ensureContractNotification(
        supabase,
        managerId,
        null,
        contractRaw.id,
        'Hợp đồng cư dân đã hết hạn',
        `Phòng ${room.room_code ?? contractRaw.id} có hợp đồng ${contractRaw.contract_code} đã hết hạn.`,
        'contract_expired'
      )
    }
  }
}

/**
 * Cảnh báo hợp đồng sắp hết hạn (30 ngày và 7 ngày trước).
 * Chỉ gửi một lần mỗi mốc nhờ dedup theo (user_id, contract_id, type).
 */
export async function syncExpiringContractWarnings(supabase: SupabaseClient) {
  const now = new Date()

  // Lấy tất cả hợp đồng active có end_date trong 30 ngày tới
  const in30Days = new Date(now)
  in30Days.setDate(in30Days.getDate() + 30)

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_code,
      end_date,
      tenant_id,
      tenant:tenants(user_id),
      room:rooms(room_code, branch_id)
    `)
    .eq('status', 'active')
    .not('end_date', 'is', null)
    .lte('end_date', in30Days.toISOString())
    .gt('end_date', now.toISOString())

  if (error) {
    console.error('Failed to load expiring contracts:', error)
    return
  }

  for (const contractRaw of (contracts ?? []) as ContractRow[]) {
    const endDate = contractRaw.end_date ? new Date(contractRaw.end_date) : null
    if (!endDate || Number.isNaN(endDate.getTime())) continue

    const tenant = firstItem(contractRaw.tenant)
    const room = firstItem(contractRaw.room)
    if (!tenant?.user_id) continue

    const daysLeft = Math.ceil(
      (endDate.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
    )

    // Mốc 30 ngày
    if (daysLeft <= 30 && daysLeft > 7) {
      await ensureContractNotification(
        supabase,
        tenant.user_id,
        contractRaw.tenant_id ?? null,
        contractRaw.id,
        'Hợp đồng sắp hết hạn',
        `Hợp đồng ${contractRaw.contract_code} tại phòng ${room?.room_code ?? contractRaw.id} sẽ hết hạn sau ${daysLeft} ngày. Vui lòng liên hệ quản lý để gia hạn.`,
        'contract_expiring_30d'
      )

      // Cảnh báo manager
      if (room?.branch_id != null) {
        let mq = supabase.from('users').select('id')
        mq = mq.or(`role.eq.super_admin,and(role.eq.manager,branch_id.eq.${room.branch_id})`)
        const { data: managers } = await mq
        for (const mgr of managers ?? []) {
          const mgrId = (mgr as { id?: string }).id
          if (!mgrId) continue
          await ensureContractNotification(
            supabase,
            mgrId,
            null,
            contractRaw.id,
            'Hợp đồng cư dân sắp hết hạn',
            `Phòng ${room.room_code ?? contractRaw.id}: hợp đồng ${contractRaw.contract_code} sẽ hết hạn sau ${daysLeft} ngày.`,
            'contract_expiring_30d'
          )
        }
      }
    }

    // Mốc 7 ngày — gửi thêm 1 lần nữa với type riêng
    if (daysLeft <= 7) {
      await ensureContractNotification(
        supabase,
        tenant.user_id,
        contractRaw.tenant_id ?? null,
        contractRaw.id,
        'Hợp đồng sắp hết hạn — còn 7 ngày',
        `Hợp đồng ${contractRaw.contract_code} tại phòng ${room?.room_code ?? contractRaw.id} chỉ còn ${daysLeft} ngày nữa sẽ hết hạn. Vui lòng gia hạn ngay!`,
        'contract_expiring_7d'
      )

      if (room?.branch_id != null) {
        let mq = supabase.from('users').select('id')
        mq = mq.or(`role.eq.super_admin,and(role.eq.manager,branch_id.eq.${room.branch_id})`)
        const { data: managers } = await mq
        for (const mgr of managers ?? []) {
          const mgrId = (mgr as { id?: string }).id
          if (!mgrId) continue
          await ensureContractNotification(
            supabase,
            mgrId,
            null,
            contractRaw.id,
            'Hợp đồng cư dân sắp hết hạn — còn 7 ngày',
            `Phòng ${room.room_code ?? contractRaw.id}: hợp đồng ${contractRaw.contract_code} chỉ còn ${daysLeft} ngày.`,
            'contract_expiring_7d'
          )
        }
      }
    }
  }
}
