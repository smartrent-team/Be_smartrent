import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    // 1. Kiểm tra JWT của người gọi API qua RBAC
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const supabase = auth.supabase!

    // 2. Lấy danh sách các chi nhánh từ bảng branches trong database
    const { data: branches, error } = await supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true })

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
