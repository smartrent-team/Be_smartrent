-- ==============================================================================
-- RLS POLICY CHO BẢNG USERS
-- Bật RLS và tạo policy cho phép đọc profile khi đã đăng nhập
-- ==============================================================================

-- Bật RLS trên bảng users (nếu chưa bật)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Xóa policy cũ nếu có (tránh lỗi trùng lặp khi chạy lại)
DROP POLICY IF EXISTS "Cho phép đọc users khi đã đăng nhập" ON users;

-- Tạo policy: authenticated user được đọc tất cả row trong bảng users
CREATE POLICY "Cho phép đọc users khi đã đăng nhập"
ON users
FOR SELECT
TO authenticated
USING (true);
