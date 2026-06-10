import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { TenantService } from '@/services/tenant.service'

export async function GET() {
  try {
    // 1. Xác thực JWT & lấy session info
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    // 2. Delegate toàn bộ business logic & data fetching sang Service
    const docs = await TenantService.getMobileTenantsList({
      supabase: auth.supabase!,
      role: auth.role,
      branchId: auth.branchId,
      organizationId: auth.organizationId
    })

    // 3. Trả kết quả
    return NextResponse.json({
      success: true,
      docs
    })

  } catch (error: unknown) {
    console.error('Error fetching tenants list:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Xử lý mapping lỗi 403 (Permission) nếu cần
    if (errorMessage.includes('không có quyền') || errorMessage.includes('chưa được gán')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
