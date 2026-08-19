import type { SupabaseClient } from '@supabase/supabase-js'
import { toVietnamDateKey } from '@/lib/date-utils'

export type AutoLockResult = {
  contractId: number
  tenantId: number
  action: string
  reason?: string
}

function todayVietnamDateKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function isContractExpired(endDate: string | null | undefined, todayKey: string): boolean {
  const endKey = toVietnamDateKey(endDate)
  if (!endKey) return false
  return endKey <= todayKey
}

/**
 * Hàm dùng chung: khóa user, expire contract, set move_out_date, giải phóng phòng.
 * Trả về action string để ghi vào results.
 */
async function lockTenantAndRelease(
  supabase: SupabaseClient,
  dispatchNotification: (s: SupabaseClient, target: { userId: string }, payload: { title: string; body: string; type: string; relatedId?: string }) => Promise<void>,
  opts: {
    tenantId: number
    userId: string | null
    contractId: number
    checkoutRequestId: number | null
    roomId: number | null
    depositAmount: number
    roomCode: string
  }
): Promise<string> {
  const { tenantId, userId, contractId, checkoutRequestId, roomId, depositAmount, roomCode } = opts

  if (userId) {
    const { error: lockErr } = await supabase
      .from('users')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (lockErr) throw lockErr
  }

  await supabase
    .from('contracts')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', contractId)

  if (checkoutRequestId) {
    await supabase
      .from('checkout_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', checkoutRequestId)
  }

  await supabase
    .from('tenants')
    .update({ move_out_date: new Date().toISOString() })
    .eq('id', tenantId)

  // Kiểm tra phòng còn hợp đồng active không
  let isLastTenant = true
  if (roomId) {
    const { count } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .in('status', ['active', 'pending_checkout'])
      .neq('id', contractId)
    isLastTenant = !count || count === 0
  }

  if (isLastTenant && roomId) {
    await supabase.from('rooms').update({ status: 'available' }).eq('id', roomId)
  }

  // Thông báo cho cư dân
  if (userId) {
    try {
      await dispatchNotification(
        supabase,
        { userId: String(userId) },
        {
          title: 'Hợp đồng đã kết thúc',
          body: `Hợp đồng tại ${roomCode} đã kết thúc. Tài khoản của bạn đã được đóng. Cảm ơn bạn đã sử dụng dịch vụ.`,
          type: 'contract',
          relatedId: String(tenantId),
        }
      )
    } catch { /* ignore */ }
  }

  // Thông báo cho super admin
  const { data: superAdmins } = await supabase.from('users').select('id').eq('role', 'super_admin')
  for (const sa of superAdmins ?? []) {
    try {
      await dispatchNotification(
        supabase,
        { userId: sa.id },
        {
          title: `Tài khoản cư dân đã bị khóa: ${roomCode}`,
          body: `Hợp đồng của cư dân tại ${roomCode} đã hết hạn. Tài khoản cư dân đã tự động bị khóa. Tiền cọc: ${depositAmount.toLocaleString('vi-VN')}đ cần được hoàn trả.`,
          type: 'contract',
          relatedId: String(tenantId),
        }
      )
    } catch { /* ignore */ }
  }

  return isLastTenant ? 'locked_expired_and_released_room' : 'locked_and_expired'
}

/**
 * Khóa tài khoản cư dân đã hết hạn hợp đồng:
 * - Có yêu cầu trả phòng được xác nhận (confirmed/invoiced/pending_settlement)
 * - HOẶC hợp đồng hết hạn mà không có yêu cầu trả phòng nào
 * Được gọi bởi cron hàng ngày hoặc instrumentation interval.
 */
export async function processExpiredCheckoutTenants(
  supabase: SupabaseClient
): Promise<{ processed: number; results: AutoLockResult[] }> {
  const todayKey = todayVietnamDateKey()
  const results: AutoLockResult[] = []

  const { data: checkoutRequests, error: reqErr } = await supabase
    .from('checkout_requests')
    .select(`
      id,
      status,
      tenant_id,
      contract_id,
      contracts (
        id,
        tenant_id,
        room_id,
        end_date,
        deposit_amount,
        status
      ),
      tenants (
        id,
        user_id,
        move_out_date,
        room_id,
        users ( status )
      )
    `)
    .in('status', ['confirmed', 'invoiced', 'pending_settlement'])
    .order('created_at', { ascending: false })

  if (reqErr) {
    console.error('[auto-lock-expired] Lỗi truy vấn checkout_requests:', reqErr)
    throw reqErr
  }

  const { dispatchNotification } = await import('@/lib/notification_dispatch')
  const processedTenantIds = new Set<number>()

  // ================================================================
  // PHẦN 1: Xử lý tenant có checkout_request đã confirmed
  // ================================================================

  for (const request of checkoutRequests ?? []) {
    const tenantId = request.tenant_id as number
    if (processedTenantIds.has(tenantId)) continue

    const contract = request.contracts as {
      id: number
      tenant_id: number
      room_id: number
      end_date: string | null
      deposit_amount: number | null
      status: string
    } | null

    const tenant = request.tenants as {
      id: number
      user_id: string | null
      move_out_date: string | null
      room_id: number | null
      users: { status: string } | { status: string }[] | null
    } | null

    if (!contract || !tenant) {
      results.push({ contractId: request.contract_id, tenantId, action: 'skipped', reason: 'Thiếu dữ liệu hợp đồng hoặc cư dân' })
      continue
    }

    if (tenant.move_out_date) { processedTenantIds.add(tenantId); continue }

    const userStatus = Array.isArray(tenant.users) ? tenant.users[0]?.status : tenant.users?.status
    if (userStatus === 'locked' || userStatus === 'blocked') { processedTenantIds.add(tenantId); continue }

    if (!isContractExpired(contract.end_date, todayKey)) {
      results.push({ contractId: contract.id, tenantId, action: 'skipped', reason: 'Hợp đồng chưa hết hạn' })
      continue
    }

    processedTenantIds.add(tenantId)

    const roomId = contract.room_id ?? tenant.room_id
    const depositAmount = contract.deposit_amount ?? 0

    const { data: roomRow } = roomId
      ? await supabase.from('rooms').select('room_code, floor').eq('id', roomId).single()
      : { data: null }
    const roomCode = roomRow?.room_code
      ? roomRow.floor ? `Phòng ${roomRow.room_code} Tầng ${roomRow.floor}` : `Phòng ${roomRow.room_code}`
      : `Phòng ID ${roomId ?? '?'}`

    // Kiểm tra hóa đơn tháng nếu là người cuối phòng
    const { count: remainingContracts } = roomId
      ? await supabase.from('contracts').select('id', { count: 'exact', head: true })
          .eq('room_id', roomId).in('status', ['active', 'pending_checkout']).neq('id', contract.id)
      : { count: 0 }
    const isLastTenantInRoom = !remainingContracts || remainingContracts === 0

    if (isLastTenantInRoom && roomId) {
      const { data: latestMonthlyInvoice } = await supabase
        .from('invoices').select('id, payment_status, total_amount, invoice_code, invoice_type')
        .eq('room_id', roomId).or('invoice_type.is.null,invoice_type.eq.monthly')
        .order('issued_at', { ascending: false }).order('created_at', { ascending: false })
        .limit(1).maybeSingle()

      if (!latestMonthlyInvoice) {
        const { data: managers } = await supabase.from('users').select('id').in('role', ['manager', 'super_admin'])
        for (const manager of managers ?? []) {
          try {
            await dispatchNotification(supabase, { userId: manager.id }, {
              title: `Chưa có hóa đơn tháng: ${roomCode}`,
              body: `Hợp đồng tại ${roomCode} đã hết hạn và đây là người cuối rời phòng. Vui lòng tạo hóa đơn tháng trước khi hoàn tất trả phòng.`,
              type: 'invoice', relatedId: String(tenantId),
            })
          } catch { /* ignore */ }
        }
        results.push({ contractId: contract.id, tenantId, action: 'blocked_no_monthly_invoice' })
        continue
      }

      if (latestMonthlyInvoice.payment_status !== 'paid') {
        try {
          if (tenant.user_id) {
            await dispatchNotification(supabase, { userId: String(tenant.user_id) }, {
              title: 'Cần thanh toán hóa đơn tháng',
              body: `Hợp đồng tại ${roomCode} đã hết hạn. Vui lòng thanh toán hóa đơn ${latestMonthlyInvoice.invoice_code} (${Number(latestMonthlyInvoice.total_amount).toLocaleString('vi-VN')}đ) để hoàn tất trả phòng.`,
              type: 'invoice', relatedId: String(latestMonthlyInvoice.id),
            })
          }
        } catch { /* ignore */ }
        results.push({ contractId: contract.id, tenantId, action: 'blocked_unpaid_monthly_invoice' })
        continue
      }
    }

    try {
      const action = await lockTenantAndRelease(supabase, dispatchNotification, {
        tenantId,
        userId: tenant.user_id,
        contractId: contract.id,
        checkoutRequestId: request.id,
        roomId,
        depositAmount,
        roomCode,
      })
      results.push({ contractId: contract.id, tenantId, action })
    } catch (lockErr) {
      console.error(`[auto-lock-expired] Lỗi khóa cư dân ${tenantId}:`, lockErr)
      results.push({ contractId: contract.id, tenantId, action: 'error', reason: String(lockErr) })
    }
  }

  // ================================================================
  // PHẦN 2: Xử lý tenant hết hạn hợp đồng KHÔNG có checkout_request
  // ================================================================

  const { data: expiredContracts, error: expiredErr } = await supabase
    .from('contracts')
    .select(`
      id,
      tenant_id,
      room_id,
      end_date,
      deposit_amount,
      status,
      tenants (
        id,
        user_id,
        move_out_date,
        room_id,
        users ( status )
      )
    `)
    .in('status', ['active', 'pending_checkout'])
    .not('end_date', 'is', null)
    .lte('end_date', todayKey)

  if (expiredErr) {
    console.error('[auto-lock-expired] Lỗi truy vấn expired contracts:', expiredErr)
  }

  for (const contract of expiredContracts ?? []) {
    const tenantId = contract.tenant_id as number
    if (!tenantId || processedTenantIds.has(tenantId)) continue

    const tenant = contract.tenants as {
      id: number
      user_id: string | null
      move_out_date: string | null
      room_id: number | null
      users: { status: string } | { status: string }[] | null
    } | null

    if (!tenant) continue
    if (tenant.move_out_date) { processedTenantIds.add(tenantId); continue }

    const userStatus = Array.isArray(tenant.users) ? tenant.users[0]?.status : tenant.users?.status
    if (userStatus === 'locked' || userStatus === 'blocked') { processedTenantIds.add(tenantId); continue }

    processedTenantIds.add(tenantId)

    const roomId = (contract.room_id as number | null) ?? tenant.room_id
    const depositAmount = (contract.deposit_amount as number | null) ?? 0

    const { data: roomRow } = roomId
      ? await supabase.from('rooms').select('room_code, floor').eq('id', roomId).single()
      : { data: null }
    const roomCode = roomRow?.room_code
      ? roomRow.floor ? `Phòng ${roomRow.room_code} Tầng ${roomRow.floor}` : `Phòng ${roomRow.room_code}`
      : `Phòng ID ${roomId ?? '?'}`

    try {
      const action = await lockTenantAndRelease(supabase, dispatchNotification, {
        tenantId,
        userId: tenant.user_id,
        contractId: contract.id,
        checkoutRequestId: null, // không có checkout_request
        roomId,
        depositAmount,
        roomCode,
      })
      results.push({ contractId: contract.id, tenantId, action: action + '_no_request' })
    } catch (lockErr) {
      console.error(`[auto-lock-expired] Lỗi khóa cư dân (no-request) ${tenantId}:`, lockErr)
      results.push({ contractId: contract.id, tenantId, action: 'error', reason: String(lockErr) })
    }
  }

  return { processed: results.length, results }
}
