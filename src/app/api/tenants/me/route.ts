import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function GET() {
  try {
    // 1. Xác thực JWT của người dùng
    const auth = await verifyRole()
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    // Chỉ cho phép tenant (hoặc manager muốn tự xem nếu họ có cấu hình là tenant - mặc dù hiếm)
    // Nhưng về cơ bản API này dành cho chính user đang đăng nhập.
    
    const supabase = auth.supabase!
    
    // 2. Fetch tenant profile associated with this user
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        id,
        move_in_date,
        move_out_date,
        user_id,
        user:users (
          id,
          full_name,
          phone,
          role
        ),
        room:rooms (
          id,
          room_code,
          base_price,
          area,
          floor,
          branch:branches (name)
        ),
        invoices (
          id,
          invoice_code,
          total_amount,
          payment_status,
          issued_at,
          qrPayload,
          checkoutUrl,
          room_price,
          service_cost,
          electric_cost,
          water_cost
        ),
        contracts (
          id,
          status,
          deposit_amount,
          start_date,
          end_date
        ),
        maintenance_tickets (
          id,
          title,
          status,
          priority,
          created_at
        )
      `)
      .eq('user_id', auth.dbUserId)
      .is('move_out_date', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ khách thuê cho tài khoản này', details: error?.message }, { status: 404 })
    }

    // Định nghĩa kiểu dữ liệu trả về từ Supabase để tránh lỗi TypeScript/ESLint
    interface UserData {
      id: string;
      full_name: string | null;
      phone: string | null;
      role: string | null;
    }
    
    interface BranchData {
      name: string;
    }
    
    interface RoomData {
      id: number;
      room_code: string;
      base_price: number;
      area: number;
      floor: number;
      branch: BranchData | null;
    }
    
    interface ContractData {
      id: number;
      status: string;
      deposit_amount: number | null;
      start_date: string;
      end_date: string | null;
    }

    const userData = tenant.user as unknown as UserData | null;
    const roomData = tenant.room as unknown as RoomData | null;
    const contractsData = tenant.contracts as unknown as ContractData[] | null;

    // Lọc lại các hợp đồng active
    const activeContract = contractsData?.find(c => c.status === 'active') || null;

    // 3. Chuẩn bị response JSON gọn gàng cho app Flutter
    const responseData = {
      tenant_id: tenant.id,
      user_id: tenant.user_id,
      full_name: userData?.full_name || 'Chưa cập nhật',
      phone: userData?.phone || 'Chưa cập nhật',
      email: auth.user.email,
      move_in_date: tenant.move_in_date,
      move_out_date: tenant.move_out_date,
      status: tenant.move_out_date ? 'past' : 'active',
      room: roomData ? {
        id: roomData.id,
        room_code: roomData.room_code,
        base_price: roomData.base_price,
        area: roomData.area,
        floor: roomData.floor,
        branch_name: roomData.branch?.name || 'Chưa phân chi nhánh'
      } : null,
      active_contract: activeContract ? {
        id: activeContract.id,
        deposit_amount: activeContract.deposit_amount,
        start_date: activeContract.start_date,
        end_date: activeContract.end_date
      } : null,
      contracts: contractsData || [],
      recent_invoices: tenant.invoices || [],
      maintenance_tickets: tenant.maintenance_tickets || [],
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error: unknown) {
    console.error('Error fetching tenant profile:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
