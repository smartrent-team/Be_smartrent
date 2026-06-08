import { createApiClient, createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'
import { headers } from 'next/headers'

export type OrgPaymentConfig = {
  organizationId: string
  paymentBankBin: string | null
  paymentAccountNumber: string | null
  paymentAccountName: string | null
}

export async function verifyRole() {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  // Nếu có Authorization header (từ mobile/swagger), dùng createApiClient, ngược lại dùng createClient (từ web cookies)
  const supabase = authHeader ? await createApiClient() : await createClient()
  
  // Nếu có authHeader (Bearer <token>), ta cắt lấy token (bỏ qua hoa/thường)
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  const { data: { user }, error: authError } = token 
    ? await supabase.auth.getUser(token) 
    : await supabase.auth.getUser()

  if (authError || !user) {
    console.error('verifyRole Auth Error:', authError?.message || 'No user found')
    return { error: 'Unauthorized', status: 401 }
  }

  // Khởi tạo Admin Client để bypass RLS (Do RLS sẽ bị khóa lại bằng USING (false))
  const adminSupabase = createAdminClient()

  // Tối ưu: 1 query JOIN duy nhất thay vì 3–4 round-trips riêng lẻ
  // Lấy role, branch_id, organization_id VÀ payment config cùng lúc
  const { data: userProfile, error: profileError } = await adminSupabase
    .from('users')
    .select(`
      id,
      role,
      branch_id,
      organization_id,
      organizations (
        payment_bank_bin,
        payment_account_number,
        payment_account_name
      )
    `)
    .eq('email', user.email)
    .single()

  if (profileError || !userProfile) {
    return { error: 'Profile not found', status: 403 }
  }

  const org = Array.isArray(userProfile.organizations)
    ? userProfile.organizations[0]
    : userProfile.organizations

  const orgPaymentConfig: OrgPaymentConfig | null = userProfile.organization_id
    ? {
        organizationId: userProfile.organization_id,
        paymentBankBin: org?.payment_bank_bin ?? null,
        paymentAccountNumber: org?.payment_account_number ?? null,
        paymentAccountName: org?.payment_account_name ?? null,
      }
    : null

  return {
    user,
    dbUserId: userProfile.id,
    role: userProfile.role as 'super_admin' | 'manager' | 'tenant',
    branchId: userProfile.branch_id,
    organizationId: userProfile.organization_id as string | null,
    orgPaymentConfig,
    supabase: adminSupabase // Cực kỳ quan trọng: Trả về admin client cho các API Route sử dụng
  }
}

// Hàm hỗ trợ kiểm tra nhanh quyền tạo tài khoản
export function canCreateUser(currentRole: string, targetRole: string) {
  if (currentRole === 'super_admin') return true
  if (currentRole === 'manager' && targetRole === 'tenant') return true
  return false
}

/**
 * Lấy tất cả branch_id thuộc về 1 organization.
 * Dùng để enforce data isolation: super_admin chỉ thấy data của org mình.
 * 
 * @returns mảng branch IDs, hoặc null nếu orgId không hợp lệ
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getOrgBranchIds(
  supabase: SupabaseClient,
  organizationId: string | null
): Promise<number[] | null> {
  if (!organizationId) return null

  const { data: branches, error } = await supabase
    .from('branches')
    .select('id')
    .eq('organization_id', organizationId)

  if (error || !branches) return []
  return branches.map((b: { id: number }) => b.id)
}


export async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Chưa đăng nhập')
  
  const adminSupabase = createAdminClient()
  let query = adminSupabase.from('users').select('role')
  
  if (user.email && user.phone) {
    query = query.or(`email.eq.${user.email},phone.eq.${user.phone}`)
  } else if (user.email) {
    query = query.eq('email', user.email)
  } else if (user.phone) {
    query = query.eq('phone', user.phone)
  }

  const { data: profile } = await query.single()
  if (profile?.role !== 'super_admin') {
    throw new Error('Bạn không có quyền thực hiện hành động này (Yêu cầu Super Admin)')
  }

  return adminSupabase
}
