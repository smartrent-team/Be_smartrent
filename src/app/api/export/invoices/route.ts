import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import * as xlsx from 'xlsx'

export async function GET(req: Request) {
  try {
    const { user, supabase, organizationId, role } = await verifyRole()
    
    if (!user || (role !== 'super_admin' && role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization attached.' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // e.g. "6"
    const year = searchParams.get('year') // e.g. "2026"
    const branchId = searchParams.get('branch_id')

    let query = supabase
      .from('invoices')
      .select(`
        invoice_code,
        total_amount,
        payment_status,
        issued_at,
        paid_at,
        electric_cost,
        water_cost,
        service_cost,
        rooms!inner(
          room_code,
          branch_id,
          branches!inner(
            organization_id
          )
        )
      `)
      // Phân quyền RLS: supabase.from() với createClient đã tự filter theo organization_id nếu có RLS, 
      // nhưng ta filter rõ ràng ở đây để chặn truy cập chéo
      .eq('rooms.branches.organization_id', organizationId)
      .order('issued_at', { ascending: false })

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString()
      const endDate = new Date(parseInt(year), parseInt(month), 1).toISOString()
      query = query.gte('issued_at', startDate).lt('issued_at', endDate)
    }

    if (branchId) {
      query = query.eq('rooms.branch_id', branchId)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('Fetch invoices for export error:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 })
    }

    // Format dữ liệu cho Excel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const excelData = invoices.map((inv: any) => ({
      'Mã Hoá Đơn': inv.invoice_code,
      'Phòng': inv.rooms?.room_code || 'N/A',
      'Tổng Tiền (VNĐ)': inv.total_amount,
      'Tiền Điện (VNĐ)': inv.electric_cost || 0,
      'Tiền Nước (VNĐ)': inv.water_cost || 0,
      'Phí Dịch Vụ (VNĐ)': inv.service_cost || 0,
      'Trạng Thái': inv.payment_status === 'paid' ? 'Đã thu' : (inv.payment_status === 'partial' ? 'Thu một phần' : 'Chưa thu'),
      'Ngày Lập': new Date(inv.issued_at).toLocaleDateString('vi-VN'),
      'Ngày Thu': inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('vi-VN') : '',
    }))

    // Tạo Workbook
    const worksheet = xlsx.utils.json_to_sheet(excelData)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'HoaDon')

    // Set độ rộng cột
    const colWidths = [
      { wch: 15 }, // Mã
      { wch: 10 }, // Phòng
      { wch: 15 }, // Tổng tiền
      { wch: 15 }, // Điện
      { wch: 15 }, // Nước
      { wch: 15 }, // Dịch vụ
      { wch: 15 }, // Trạng thái
      { wch: 15 }, // Ngày lập
      { wch: 15 }, // Ngày thu
    ];
    worksheet['!cols'] = colWidths

    // Ghi ra buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const response = new NextResponse(buffer)
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.headers.set('Content-Disposition', `attachment; filename="HoaDon_${month || 'All'}_${year || 'All'}.xlsx"`)
    return response

  } catch (error) {
    console.error('API /export/invoices error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
