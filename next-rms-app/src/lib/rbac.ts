import { createApiClient } from './supabase/server'

export async function verifyRole() {
  const supabase = await createApiClient()
  
  // 1. Xác thực JWT (từ Authorization Header)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  // 2. Lấy role và branch_id
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role, branch_id')
    .eq('id', user.id)
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
