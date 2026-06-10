import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrgBranchIds } from '@/lib/rbac'

export interface TenantRecord {
  id: number;
  room_id: number;
  move_in_date: string;
  move_out_date: string | null;
  rooms: { id: number; room_code: string; branch_id: number } | null;
  user: { id: number; full_name: string; phone: string; role: string; email: string } | null;
}

export interface MobileTenantDoc {
  id: number;
  name: string;
  phone: string;
  checkInDate: string;
  isRoomHead: boolean;
  initial: string;
}

export class TenantService {
  /**
   * Lấy danh sách cư dân (cho mobile app), tự động phân quyền theo role của user hiện tại
   */
  static async getMobileTenantsList(params: {
    supabase: SupabaseClient;
    role: string;
    branchId: number | null;
    organizationId: number | null;
  }): Promise<MobileTenantDoc[]> {
    const { supabase, role, branchId, organizationId } = params;

    // 1. Khách thuê (tenant) không được xem danh sách này
    if (role === 'tenant') {
      throw new Error('Khách thuê không có quyền xem danh sách cư dân');
    }

    // 2. Xây dựng truy vấn cơ bản
    let query = supabase
      .from('tenants')
      .select(`
        id,
        move_in_date,
        move_out_date,
        room:rooms!inner(
          room_code,
          branch_id
        ),
        user:users!inner(
          id,
          full_name,
          phone,
          role,
          branch_id
        )
      `)
      .eq('user.status', 'active');

    // 3. Phân quyền truy cập dữ liệu
    if (role === 'manager') {
      if (!branchId) {
        throw new Error('Tài khoản Manager chưa được gán chi nhánh');
      }
      query = query.eq('rooms.branch_id', branchId);
    } else if (role === 'super_admin') {
      if (!organizationId) {
        throw new Error('Tài khoản Super Admin chưa được gán tổ chức');
      }
      const branchIds = await getOrgBranchIds(supabase, organizationId);
      if (!branchIds || branchIds.length === 0) {
        return []; // Không có chi nhánh nào thì danh sách rỗng
      }
      query = query.in('rooms.branch_id', branchIds);
    }

    // 4. Lấy dữ liệu
    const { data: tenantsData, error } = await query;
    if (error) {
      throw error;
    }

    // 5. Mapping dữ liệu trả về cho Mobile App
    const docs = ((tenantsData || []) as unknown as TenantRecord[])
      .filter(t => t.user !== null) // Loại bỏ các bản ghi không có user hợp lệ
      .map(t => {
        const fullName = t.user?.full_name || 'Không tên';
        // Lấy chữ cái đầu tiên của Tên cuối cùng làm initial đại diện
        const nameParts = fullName.trim().split(' ');
        const initial = nameParts.length > 0 ? nameParts[nameParts.length - 1][0].toUpperCase() : 'C';
        
        return {
          id: t.id,
          name: fullName,
          phone: t.user?.phone || 'Chưa cập nhật',
          checkInDate: t.move_in_date ? new Date(t.move_in_date).toLocaleDateString('vi-VN') : 'Chưa cập nhật',
          isRoomHead: t.user?.role === 'owner',
          initial: initial,
        };
      });

    return docs;
  }
}
