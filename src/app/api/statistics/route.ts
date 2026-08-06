import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Tenant không có quyền xem thống kê' }, { status: 403 })
    }

    const supabase = auth.supabase!
    
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    let roomQuery = supabase.from('rooms').select('id, branch_id, status, area, base_price')
    let invoiceQuery = supabase.from('invoices').select('id, room_id, total_amount, payment_status, issued_at')
    
    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Người dùng chưa được gán vào cơ sở nào' }, { status: 403 })
      }
      roomQuery = roomQuery.eq('branch_id', auth.branchId)
    }

    // Lấy rooms trước để có room_id list cho invoice filter
    const { data: rooms, error: err1 } = await roomQuery
    if (err1) throw err1

    const roomList = rooms || []
    const branchRoomIds = roomList.map((r: { id: number }) => r.id)

    if (auth.role === 'manager' && branchRoomIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { totalRevenue: 0, totalDebt: 0, totalRooms: 0, occupiedRooms: 0, occupancyRate: 0, paidInvoicesCount: 0, unpaidInvoicesCount: 0 }
      })
    }

    if (auth.role === 'manager') {
      invoiceQuery = invoiceQuery.in('room_id', branchRoomIds)
    }

    // Fetch invoices song song
    const [
      { data: monthInvoices, error: err2 },
      { data: debtInvoices,  error: err3 },
    ] = await Promise.all([
      invoiceQuery.gte('issued_at', monthStart).lt('issued_at', monthEnd),
      invoiceQuery.in('payment_status', ['unpaid', 'partial'])
    ])
    const mInvoices = monthInvoices || []
    const dInvoices = debtInvoices || []

    const totalRooms = roomList.length
    const occupiedRooms = roomList.filter(r => r.status === 'occupied').length
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    const paidInvoices = mInvoices.filter(inv => inv.payment_status === 'paid')
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    
    const totalDebt = dInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    const paidInvoicesCount = paidInvoices.length
    const unpaidInvoicesCount = dInvoices.length

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalDebt,
        totalRooms,
        occupiedRooms,
        occupancyRate,
        paidInvoicesCount,
        unpaidInvoicesCount
      }
    })

  } catch (error: unknown) {
    console.error('Error fetching statistics:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
