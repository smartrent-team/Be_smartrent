import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrgBranchIds } from '@/lib/rbac'

export interface GetRoomsOptions {
  status?: string | null;
  branchId?: number | null;
  search?: string | null;
  floor?: number | null;
  page?: number;
  limit?: number;
}

export interface RoomTenant {
  id: number;
  move_in_date: string;
  move_out_date: string | null;
  user: {
    id?: number;
    full_name: string | null;
    phone: string | null;
  } | null;
}

export interface RoomInvoice {
  id: number;
  total_amount: number;
  payment_status: string;
  issued_at: string;
}

export interface RoomTicket {
  id: number;
  title: string;
  priority: string;
  status: string;
  created_at: string;
}

export class RoomService {
  /**
   * Lấy danh sách phòng với phân trang, tìm kiếm và phân quyền tự động
   */
  static async getRoomsList(params: {
    supabase: SupabaseClient;
    role: string;
    authBranchId: number | null;
    organizationId: number | null;
    options: GetRoomsOptions;
  }) {
    const { supabase, role, authBranchId, organizationId, options } = params;
    const { status, branchId, search, floor, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('rooms')
      .select(`
        *,
        branch:branches(name),
        tenants (
          id, move_in_date, move_out_date, user:users(full_name, phone)
        )
      `, { count: 'exact' })
      .order('room_code', { ascending: true });

    // 1. Phân quyền truy cập
    if (role === 'tenant') {
      throw new Error('Tenant không có quyền xem danh sách phòng');
    } else if (role === 'manager') {
      if (!authBranchId) throw new Error('Người dùng chưa được gán vào cơ sở nào');
      query = query.eq('branch_id', authBranchId);
    } else if (role === 'super_admin') {
      if (!organizationId) throw new Error('Tài khoản Super Admin chưa được gán tổ chức');
      const branchIds = await getOrgBranchIds(supabase, organizationId);
      if (!branchIds || branchIds.length === 0) {
        return { docs: [], totalDocs: 0, limit, page, totalPages: 0 };
      }
      
      if (branchId) {
        if (!branchIds.includes(Number(branchId))) {
          throw new Error('Chi nhánh không thuộc tổ chức của bạn');
        }
        query = query.eq('branch_id', branchId);
      } else {
        query = query.in('branch_id', branchIds);
      }
    } else {
      // Unauthenticated / other roles
      query = query.eq('status', 'available');
      if (branchId) query = query.eq('branch_id', branchId);
    }

    // 2. Bộ lọc
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('room_code', `%${search}%`);
    if (floor && !Number.isNaN(floor)) query = query.eq('floor', floor);

    // 3. Phân trang
    query = query.range(offset, offset + limit - 1);

    const { data: rooms, error, count } = await query;
    if (error) throw error;

    // 4. Transform dữ liệu
    const docs = (rooms || []).map(room => {
      const tenantsList = room.tenants as unknown as RoomTenant[];
      const activeTenant = tenantsList && tenantsList.length > 0 
        ? tenantsList.find(t => !t.move_out_date) 
        : null;

      const tenant = activeTenant ? {
        id: activeTenant.id,
        name: activeTenant.user?.full_name || 'Khách chưa có tên',
        phone: activeTenant.user?.phone || 'Chưa cập nhật',
        check_in_date: activeTenant.move_in_date
      } : null;

      return {
        id: room.id,
        roomCode: room.room_code,
        floor: room.floor,
        area: room.area,
        basePrice: room.base_price,
        electricPrice: room.electric_price,
        waterPrice: room.water_price,
        status: room.status,
        branch: room.branch_id,
        branchName: room.branch?.name,
        tenant
      };
    });

    return {
      docs,
      totalDocs: count || 0,
      limit,
      page,
      totalPages: count ? Math.ceil(count / limit) : 0,
    };
  }

  /**
   * Lấy chi tiết một phòng bao gồm hóa đơn, sự cố và lịch sử cư dân
   */
  static async getRoomDetail(params: {
    supabase: SupabaseClient;
    roomId: number;
    role: string;
    authBranchId: number | null;
    organizationId: number | null;
    dbUserId: number;
  }) {
    const { supabase, roomId, role, authBranchId, organizationId, dbUserId } = params;

    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        *,
        tenants (
          id, move_in_date, move_out_date, user:users(id, full_name, phone)
        ),
        invoices (
          id, total_amount, payment_status, issued_at
        ),
        maintenance_tickets (
          id, title, priority, status, created_at
        )
      `)
      .eq('id', roomId)
      .single();

    if (error || !room) {
      throw new Error('Không tìm thấy phòng được yêu cầu');
    }

    // 1. Phân quyền
    if (role === 'manager') {
      if (!authBranchId || room.branch_id !== authBranchId) {
        throw new Error('Bạn không có quyền truy cập thông tin phòng thuộc chi nhánh khác');
      }
    } else if (role === 'tenant') {
      const isMyRoom = (room.tenants as unknown as RoomTenant[])?.some(t => t.user?.id === dbUserId && !t.move_out_date);
      if (!isMyRoom) {
        throw new Error('Bạn chỉ có quyền xem chi tiết phòng của chính mình');
      }
    } else if (role === 'super_admin') {
      // Fix: Super admin phải sở hữu chi nhánh này
      if (!organizationId) throw new Error('Tài khoản Super Admin chưa được gán tổ chức');
      const branchIds = await getOrgBranchIds(supabase, organizationId);
      if (!branchIds?.includes(room.branch_id)) {
        throw new Error('Phòng này không thuộc tổ chức của bạn');
      }
    }

    // 2. Transform dữ liệu
    const roomTenants = room.tenants as unknown as RoomTenant[];
    const activeTenant = roomTenants?.find(t => !t.move_out_date) || null;

    const tenantInfo = activeTenant ? {
      id: activeTenant.id,
      name: activeTenant.user?.full_name || 'Khách chưa có tên',
      phone: activeTenant.user?.phone || 'Chưa cập nhật',
      checkInDate: activeTenant.move_in_date
    } : null;

    const invoicesList = ((room.invoices || []) as unknown as RoomInvoice[]).map(inv => ({
      id: inv.id,
      totalAmount: inv.total_amount,
      paymentStatus: inv.payment_status,
      issuedAt: inv.issued_at
    }));

    const ticketsList = ((room.maintenance_tickets || []) as unknown as RoomTicket[]).map(tick => ({
      id: tick.id,
      title: tick.title,
      priority: tick.priority,
      status: tick.status,
      createdAt: tick.created_at
    }));

    return {
      id: room.id,
      roomCode: room.room_code,
      floor: room.floor,
      area: room.area,
      basePrice: room.base_price,
      electricPrice: room.electric_price,
      waterPrice: room.water_price,
      status: room.status,
      tenant: tenantInfo,
      invoices: invoicesList,
      tickets: ticketsList
    };
  }

  /**
   * Thêm phòng mới
   */
  static async addRoom(params: {
    supabase: SupabaseClient;
    roomNumber: string;
    branchId: number;
    price: number;
    area?: number;
    floor?: number;
  }) {
    const { supabase, roomNumber, branchId, price, area, floor } = params;

    const { error } = await supabase
      .from('rooms')
      .insert([
        {
          room_code: roomNumber,
          branch_id: branchId,
          base_price: price,
          area: area || null,
          floor: floor || null,
          status: 'available'
        }
      ]);

    if (error) {
      throw new Error(error.message);
    }
    
    return true;
  }
}
