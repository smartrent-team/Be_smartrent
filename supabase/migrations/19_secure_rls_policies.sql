-- ==============================================================================
-- BƯỚC 1: TẠO CÁC HÀM HỖ TRỢ TRÍCH XUẤT NGỮ CẢNH NGƯỜI DÙNG (USER CONTEXT)
-- ==============================================================================
-- Các hàm này dùng SECURITY DEFINER để có thể đọc bảng users một cách an toàn
-- và STABLE để PostgreSQL cache kết quả cho mỗi query, đảm bảo tốc độ cực nhanh.

CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text AS $$
  SELECT role::text FROM public.users 
  WHERE (auth.jwt()->>'email' IS NOT NULL AND email = auth.jwt()->>'email')
     OR (auth.jwt()->>'phone' IS NOT NULL AND phone = auth.jwt()->>'phone')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_org_id() RETURNS integer AS $$
  SELECT organization_id FROM public.users 
  WHERE (auth.jwt()->>'email' IS NOT NULL AND email = auth.jwt()->>'email')
     OR (auth.jwt()->>'phone' IS NOT NULL AND phone = auth.jwt()->>'phone')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_branch_id() RETURNS integer AS $$
  SELECT branch_id FROM public.users 
  WHERE (auth.jwt()->>'email' IS NOT NULL AND email = auth.jwt()->>'email')
     OR (auth.jwt()->>'phone' IS NOT NULL AND phone = auth.jwt()->>'phone')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_db_id() RETURNS integer AS $$
  SELECT id FROM public.users 
  WHERE (auth.jwt()->>'email' IS NOT NULL AND email = auth.jwt()->>'email')
     OR (auth.jwt()->>'phone' IS NOT NULL AND phone = auth.jwt()->>'phone')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Đảm bảo có index trên email và phone để các hàm này chạy nhanh nhất
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_phone_idx ON public.users(phone);

-- ==============================================================================
-- BƯỚC 2: XÓA CÁC CHÍNH SÁCH RLS LỖ HỔNG CŨ HOẶC CHÍNH SÁCH KHÓA CỨNG (USING FALSE)
-- ==============================================================================
DO $$ 
DECLARE 
  r RECORD;
BEGIN 
  -- Lấy danh sách tất cả các policy của các bảng cốt lõi và xóa đi để làm lại từ đầu
  FOR r IN (
    SELECT pol.polname, cls.relname
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relname IN ('branches', 'rooms', 'tenants', 'invoices', 'maintenance_tickets', 'contracts', 'utility_logs')
  ) LOOP 
    EXECUTE 'DROP POLICY IF EXISTS "' || r.polname || '" ON "public"."' || r.relname || '"'; 
  END LOOP; 
END $$;

-- Đảm bảo RLS đã được bật
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- BƯỚC 3: THIẾT LẬP RLS POLICIES AN TOÀN TUYỆT ĐỐI (DEFENSE IN DEPTH)
-- ==============================================================================

-- 1. Bảng BRANCHES (Chi nhánh)
CREATE POLICY "branches_isolation_policy" ON public.branches
FOR ALL TO authenticated USING (
   (public.get_user_role() = 'super_admin' AND organization_id = public.get_user_org_id())
   OR
   (public.get_user_role() = 'manager' AND id = public.get_user_branch_id())
   OR
   (public.get_user_role() = 'tenant') -- Khách thuê có thể được xem danh sách chi nhánh nếu cần thiết
);

-- 2. Bảng ROOMS (Phòng trọ)
-- Tạo các hàm helper chạy dưới quyền admin (SECURITY DEFINER) để bypass RLS, tránh đệ quy vô hạn

-- Kiểm tra xem tenant có thuộc phòng này không (bỏ qua RLS của tenants)
CREATE OR REPLACE FUNCTION public.check_tenant_room_access(p_room_id integer) RETURNS boolean AS $$
DECLARE
  v_user_db_id integer;
BEGIN
  v_user_db_id := public.get_user_db_id();
  RETURN EXISTS (
    SELECT 1 FROM public.tenants WHERE room_id = p_room_id AND user_id = v_user_db_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Kiểm tra xem super admin có quyền với tenant này không (bỏ qua RLS của rooms)
CREATE OR REPLACE FUNCTION public.check_super_admin_tenant_access(p_room_id integer) RETURNS boolean AS $$
DECLARE
  v_org_id integer;
BEGIN
  v_org_id := public.get_user_org_id();
  RETURN EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.branches b ON r.branch_id = b.id
    WHERE r.id = p_room_id AND b.organization_id = v_org_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Kiểm tra xem manager có quyền với tenant này không (bỏ qua RLS của rooms)
CREATE OR REPLACE FUNCTION public.check_manager_tenant_access(p_room_id integer) RETURNS boolean AS $$
DECLARE
  v_branch_id integer;
BEGIN
  v_branch_id := public.get_user_branch_id();
  RETURN EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = p_room_id AND r.branch_id = v_branch_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE POLICY "rooms_isolation_policy" ON public.rooms
FOR ALL TO authenticated USING (
   (public.get_user_role() = 'super_admin' AND branch_id IN (SELECT id FROM public.branches WHERE organization_id = public.get_user_org_id()))
   OR
   (public.get_user_role() = 'manager' AND branch_id = public.get_user_branch_id())
   OR
   (public.get_user_role() = 'tenant' AND public.check_tenant_room_access(id))
);

CREATE POLICY "tenants_isolation_policy" ON public.tenants
FOR ALL TO authenticated USING (
   (public.get_user_role() = 'super_admin' AND public.check_super_admin_tenant_access(room_id))
   OR
   (public.get_user_role() = 'manager' AND public.check_manager_tenant_access(room_id))
   OR
   (public.get_user_role() = 'tenant' AND user_id = public.get_user_db_id())
);

-- 4. Bảng INVOICES (Hóa đơn)
CREATE POLICY "invoices_isolation_policy" ON public.invoices
FOR ALL TO authenticated USING (
   (public.get_user_role() = 'super_admin' AND public.check_super_admin_tenant_access(room_id))
   OR
   (public.get_user_role() = 'manager' AND public.check_manager_tenant_access(room_id))
   OR
   (public.get_user_role() = 'tenant' AND room_id IN (SELECT room_id FROM public.tenants WHERE user_id = public.get_user_db_id()))
);

-- 5. Bảng MAINTENANCE_TICKETS (Sự cố)
CREATE POLICY "maintenance_tickets_isolation_policy" ON public.maintenance_tickets
FOR ALL TO authenticated USING (
   (public.get_user_role() = 'super_admin' AND public.check_super_admin_tenant_access(room_id))
   OR
   (public.get_user_role() = 'manager' AND public.check_manager_tenant_access(room_id))
   OR
   (public.get_user_role() = 'tenant' AND tenant_id IN (SELECT id FROM public.tenants WHERE user_id = public.get_user_db_id()))
);

-- 6. Bảng CONTRACTS (Hợp đồng)
CREATE POLICY "contracts_isolation_policy" ON public.contracts
FOR ALL TO authenticated USING (
   (public.get_user_role() = 'super_admin' AND room_id IN (SELECT r.id FROM public.rooms r JOIN public.branches b ON r.branch_id = b.id WHERE b.organization_id = public.get_user_org_id()))
   OR
   (public.get_user_role() = 'manager' AND room_id IN (SELECT id FROM public.rooms WHERE branch_id = public.get_user_branch_id()))
   OR
   (public.get_user_role() = 'tenant' AND tenant_id IN (SELECT id FROM public.tenants WHERE user_id = public.get_user_db_id()))
);

-- 7. Bảng UTILITY_LOGS (Chỉ số điện nước)
CREATE POLICY "utility_logs_isolation_policy" ON public.utility_logs
FOR ALL TO authenticated USING (
   (public.get_user_role() = 'super_admin' AND room_id IN (SELECT r.id FROM public.rooms r JOIN public.branches b ON r.branch_id = b.id WHERE b.organization_id = public.get_user_org_id()))
   OR
   (public.get_user_role() = 'manager' AND room_id IN (SELECT id FROM public.rooms WHERE branch_id = public.get_user_branch_id()))
   OR
   (public.get_user_role() = 'tenant' AND room_id IN (SELECT room_id FROM public.tenants WHERE user_id = public.get_user_db_id()))
);
