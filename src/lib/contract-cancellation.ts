import type { SupabaseClient } from '@supabase/supabase-js'

type AuthContext = {
  role: 'super_admin' | 'manager' | 'tenant'
  branchId: number | null
  dbUserId: string
}

type ContractRow = {
  id: number
  tenant_id: number
  room_id: number
  status: string
  cancel_request_status: string | null
  cancel_requested_by: string | null
  cancel_reason: string | null
  cancel_requested_at: string | null
  room?: {
    branch_id: number | null
  } | null
  tenant?: {
    user_id: string
  } | null
}

export type CancellationRequestPayload = {
  status: 'pending'
  requestedBy: 'tenant' | 'manager'
  reason: string
  requestedAt: string
} | null

export function buildCancellationPayload(contract: ContractRow): CancellationRequestPayload {
  if (contract.cancel_request_status !== 'pending') return null
  if (!contract.cancel_requested_by) return null

  return {
    status: 'pending',
    requestedBy: contract.cancel_requested_by as 'tenant' | 'manager',
    reason: contract.cancel_reason || '',
    requestedAt: contract.cancel_requested_at || new Date().toISOString(),
  }
}

async function loadContract(
  supabase: SupabaseClient,
  contractId: number
): Promise<{ contract: ContractRow | null; error?: string; status?: number }> {
  const withCancellation = await supabase
    .from('contracts')
    .select(`
      id,
      tenant_id,
      room_id,
      status,
      cancel_request_status,
      cancel_requested_by,
      cancel_reason,
      cancel_requested_at,
      room:rooms(branch_id),
      tenant:tenants(user_id)
    `)
    .eq('id', contractId)
    .single()

  if (!withCancellation.error && withCancellation.data) {
    return { contract: withCancellation.data as unknown as ContractRow }
  }

  const message = withCancellation.error?.message ?? ''
  if (!message.includes('cancel_')) {
    return { contract: null, error: 'Không tìm thấy hợp đồng', status: 404 }
  }

  const basic = await supabase
    .from('contracts')
    .select(`
      id,
      tenant_id,
      room_id,
      status,
      room:rooms(branch_id),
      tenant:tenants(user_id)
    `)
    .eq('id', contractId)
    .single()

  if (basic.error || !basic.data) {
    return { contract: null, error: 'Không tìm thấy hợp đồng', status: 404 }
  }

  return {
    contract: {
      ...(basic.data as unknown as ContractRow),
      cancel_request_status: null,
      cancel_requested_by: null,
      cancel_reason: null,
      cancel_requested_at: null,
    },
  }
}

function assertContractAccess(
  auth: AuthContext,
  contract: ContractRow
): { error?: string; status?: number } {
  if (auth.role === 'tenant') {
    const tenantUserId = contract.tenant?.user_id
    if (!tenantUserId || tenantUserId !== auth.dbUserId) {
      return { error: 'Bạn không có quyền thao tác hợp đồng này', status: 403 }
    }
    return {}
  }

  if (auth.role === 'manager') {
    const branchId = contract.room?.branch_id
    if (auth.branchId != null && branchId != null && branchId !== auth.branchId) {
      return { error: 'Bạn không có quyền thao tác hợp đồng chi nhánh khác', status: 403 }
    }
    return {}
  }

  return {}
}

export async function requestContractCancellation(
  supabase: SupabaseClient,
  contractId: number,
  auth: AuthContext,
  reason: string
): Promise<
  | { success: true; cancellationRequest: NonNullable<CancellationRequestPayload> }
  | { error: string; status: number }
> {
  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    return { error: 'Vui lòng nhập lý do hủy hợp đồng', status: 400 }
  }

  const { contract, error, status } = await loadContract(supabase, contractId)
  if (!contract) {
    return { error: error || 'Không tìm thấy hợp đồng', status: status || 404 }
  }

  const access = assertContractAccess(auth, contract)
  if (access.error) {
    return { error: access.error, status: access.status || 403 }
  }

  if (contract.status !== 'active') {
    return { error: 'Chỉ có thể yêu cầu hủy hợp đồng đang hiệu lực', status: 400 }
  }

  if (contract.cancel_request_status === 'pending') {
    return { error: 'Đã có yêu cầu hủy hợp đồng đang chờ xử lý', status: 400 }
  }

  const requestedBy = auth.role === 'tenant' ? 'tenant' : 'manager'
  const requestedAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('contracts')
    .update({
      cancel_request_status: 'pending',
      cancel_requested_by: requestedBy,
      cancel_reason: trimmedReason,
      cancel_requested_at: requestedAt,
    })
    .eq('id', contractId)

  if (updateError) {
    const message = updateError.message ?? ''
    if (message.includes('cancel_')) {
      return {
        error: 'Chức năng hủy hợp đồng chưa được kích hoạt trên máy chủ. Vui lòng liên hệ quản trị viên.',
        status: 503,
      }
    }
    return { error: 'Không thể gửi yêu cầu hủy hợp đồng', status: 400 }
  }

  return {
    success: true,
    cancellationRequest: {
      status: 'pending',
      requestedBy,
      reason: trimmedReason,
      requestedAt,
    },
  }
}

export async function respondContractCancellation(
  supabase: SupabaseClient,
  contractId: number,
  auth: AuthContext,
  action: 'approve' | 'reject'
): Promise<{ success: true; status: string } | { error: string; status: number }> {
  const { contract, error, status } = await loadContract(supabase, contractId)
  if (!contract) {
    return { error: error || 'Không tìm thấy hợp đồng', status: status || 404 }
  }

  const access = assertContractAccess(auth, contract)
  if (access.error) {
    return { error: access.error, status: access.status || 403 }
  }

  if (contract.status !== 'active' || contract.cancel_request_status !== 'pending') {
    return { error: 'Không có yêu cầu hủy hợp đồng đang chờ xử lý', status: 400 }
  }

  const requestedBy = contract.cancel_requested_by
  if (!requestedBy) {
    return { error: 'Yêu cầu hủy hợp đồng không hợp lệ', status: 400 }
  }

  const responderRole = auth.role === 'tenant' ? 'tenant' : 'manager'
  if (requestedBy === responderRole) {
    return { error: 'Bạn không thể tự xử lý yêu cầu do chính mình gửi', status: 403 }
  }

  if (action === 'reject') {
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        cancel_request_status: null,
        cancel_requested_by: null,
        cancel_reason: null,
        cancel_requested_at: null,
      })
      .eq('id', contractId)

    if (updateError) {
      return { error: 'Không thể từ chối yêu cầu hủy hợp đồng', status: 400 }
    }

    return { success: true, status: 'active' }
  }

  const { error: updateError } = await supabase
    .from('contracts')
    .update({
      status: 'cancelled',
      cancel_request_status: null,
      cancel_requested_by: null,
      cancel_reason: null,
      cancel_requested_at: null,
    })
    .eq('id', contractId)

  if (updateError) {
    return { error: 'Không thể hủy hợp đồng', status: 400 }
  }

  return { success: true, status: 'cancelled' }
}
