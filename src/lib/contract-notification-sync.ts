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

async function notificationExists(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  type: string
) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('title', title)
    .eq('body', body)
    .eq('type', type)
    .maybeSingle()

  if (error) {
    console.error('Failed to check notification existence:', error)
    return false
  }

  return Boolean(data)
}

async function ensureNotification(
  supabase: SupabaseClient,
  userId: string,
  tenantId: number | null,
  title: string,
  body: string,
  type: string
) {
  const exists = await notificationExists(supabase, userId, title, body, type)
  if (exists) return false

  await dispatchNotification(supabase, { userId, tenantId }, { title, body, type })
  return true
}

export async function syncExpiredContractNotifications(
  supabase: SupabaseClient,
  context: {
    userId: string
    role: 'super_admin' | 'manager' | 'tenant'
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
      23,
      59,
      59,
      999
    )

    if (new Date() <= expiryBoundary) {
      continue
    }

    const tenant = firstItem(contractRaw.tenant)
    const room = firstItem(contractRaw.room)

    if (!tenant?.user_id || !room?.branch_id) continue

    if (context.role === 'tenant' && tenant.user_id !== context.userId) {
      continue
    }

    if (context.role === 'manager' && context.branchId != null && room.branch_id !== context.branchId) {
      continue
    }

    if (contractRaw.status !== 'expired') {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'expired', end_date: contractRaw.end_date })
        .eq('id', contractRaw.id)

      if (updateError) {
        console.error('Failed to mark contract expired:', updateError)
      }
    }

    const tenantTitle = 'Hợp đồng đã hết hạn'
    const tenantBody = `Hợp đồng ${contractRaw.contract_code} tại phòng ${room.room_code ?? contractRaw.id} đã hết hạn.`
    await ensureNotification(
      supabase,
      tenant.user_id,
      contractRaw.tenant_id ?? null,
      tenantTitle,
      tenantBody,
      'contract'
    )

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

    const managerTitle = 'Hợp đồng cư dân đã hết hạn'
    const managerBody = `Phòng ${room.room_code ?? contractRaw.id} có hợp đồng ${contractRaw.contract_code} đã hết hạn.`

    for (const manager of managers ?? []) {
      const managerId = (manager as { id?: string }).id
      if (!managerId) continue
      await ensureNotification(supabase, managerId, null, managerTitle, managerBody, 'contract')
    }
  }
}
