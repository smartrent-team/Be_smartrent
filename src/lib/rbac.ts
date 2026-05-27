import { createApiClient, createClient } from './supabase/server'
import { headers } from 'next/headers'

export async function verifyRole() {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  // Nếu có Authorization header (từ mobile/swagger), dùng createApiClient, ngược lại dùng createClient (từ web cookies)
  const supabase = authHeader ? await createApiClient() : await createClient()
  
  // 1. Xác thực JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  // 2. Lấy role và branch_id
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role, branch_id')
    .eq('email', user.email)
    .single()

  if (profileError || !userProfile) {
    return { error: 'Profile not found', status: 403 }
  }

  return {
    user,
    role: userProfile.role as 'super_admin' | 'manager' | 'tenant',
    branchId: userProfile.branch_id,
    supabase
  }
}

// Hàm hỗ trợ kiểm tra nhanh quyền tạo tài khoản
export function canCreateUser(currentRole: string, targetRole: string) {
  if (currentRole === 'super_admin') return true
  if (currentRole === 'manager' && targetRole === 'tenant') return true
  return false
}
