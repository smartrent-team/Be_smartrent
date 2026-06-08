import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET() {
  try {
    // 1. Kiểm tra JWT của người gọi API qua RBAC
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!

    // 2. Lấy danh sách các chi nhánh từ bảng branches trong database
    let query = supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true })

    // Phân quyền data isolation
    if (auth.role === 'super_admin') {
      if (!auth.organizationId) {
         return NextResponse.json({ error: 'Tài khoản Super Admin chưa được gán tổ chức' }, { status: 403 })
      }
      query = query.eq('organization_id', auth.organizationId)
    } else if (auth.role === 'manager') {
      if (!auth.branchId) {
         return NextResponse.json({ error: 'Tài khoản Manager chưa được gán chi nhánh' }, { status: 403 })
      }
      query = query.eq('id', auth.branchId)
    }

    const { data: branches, error } = await query

    if (error) {
      throw error
    }

    // 3. Trả về cấu trúc JSON chứa mảng docs giống định dạng Frontend di động mong đợi
    return NextResponse.json({
      success: true,
      docs: branches || []
    })

  } catch (error: unknown) {
    console.error('Error fetching branches:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
