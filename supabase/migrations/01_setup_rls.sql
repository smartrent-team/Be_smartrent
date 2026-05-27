-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> Tạo query mới và paste toàn bộ code bên dưới vào để chạy.

-- ==============================================================================
-- 1. BẬT RLS (ROW LEVEL SECURITY) CHO TẤT CẢ CÁC BẢNG CHÍNH
-- ==============================================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. TẠO POLICIES (QUYỀN TRUY CẬP)
-- Ví dụ cơ bản: Chỉ những người dùng đã đăng nhập mới được truy cập dữ liệu.
-- Sử dụng cơ chế DROP POLICY IF EXISTS trước khi tạo để tránh lỗi trùng lặp khi chạy lại nhiều lần.
-- ==============================================================================

-- A. Dành cho bảng INVOICES (Hóa đơn)
DROP POLICY IF EXISTS "Cho phép đọc/ghi hóa đơn nếu đã đăng nhập" ON invoices;
CREATE POLICY "Cho phép đọc/ghi hóa đơn nếu đã đăng nhập" 
ON invoices 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- B. Dành cho bảng ROOMS (Phòng trọ)
DROP POLICY IF EXISTS "Cho phép đọc/ghi phòng trọ nếu đã đăng nhập" ON rooms;
CREATE POLICY "Cho phép đọc/ghi phòng trọ nếu đã đăng nhập" 
ON rooms 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- C. Dành cho bảng TENANTS (Khách thuê)
DROP POLICY IF EXISTS "Cho phép đọc/ghi khách thuê nếu đã đăng nhập" ON tenants;
CREATE POLICY "Cho phép đọc/ghi khách thuê nếu đã đăng nhập" 
ON tenants 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- D. Dành cho bảng MAINTENANCE TICKETS (Yêu cầu hỗ trợ)
DROP POLICY IF EXISTS "Cho phép đọc/ghi yêu cầu nếu đã đăng nhập" ON maintenance_tickets;
CREATE POLICY "Cho phép đọc/ghi yêu cầu nếu đã đăng nhập" 
ON maintenance_tickets 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- E. Dành cho bảng CONTRACTS (Hợp đồng)
DROP POLICY IF EXISTS "Cho phép đọc/ghi hợp đồng nếu đã đăng nhập" ON contracts;
CREATE POLICY "Cho phép đọc/ghi hợp đồng nếu đã đăng nhập" 
ON contracts 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- F. Dành cho bảng UTILITY LOGS (Chỉ số điện nước)
DROP POLICY IF EXISTS "Cho phép đọc/ghi chỉ số điện nước nếu đã đăng nhập" ON utility_logs;
CREATE POLICY "Cho phép đọc/ghi chỉ số điện nước nếu đã đăng nhập" 
ON utility_logs 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- G. Dành cho bảng BRANCHES (Chi nhánh)
DROP POLICY IF EXISTS "Cho phép đọc/ghi chi nhánh nếu đã đăng nhập" ON branches;
CREATE POLICY "Cho phép đọc/ghi chi nhánh nếu đã đăng nhập" 
ON branches 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL);
