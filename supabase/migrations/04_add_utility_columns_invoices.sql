-- ==============================================================================
-- THÊM CÁC CỘT CHỈ SỐ ĐIỆN NƯỚC VÀO BẢNG INVOICES
-- Chạy trên Supabase Dashboard -> SQL Editor -> New query
-- ==============================================================================

-- Thêm cột chỉ số điện cũ/mới
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electric_old numeric DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electric_new numeric DEFAULT NULL;

-- Thêm cột chỉ số nước cũ/mới
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS water_old numeric DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS water_new numeric DEFAULT NULL;

-- Thêm cột liên kết đến utility_logs
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS utility_log_id bigint DEFAULT NULL;

-- Thêm các cột chi phí chi tiết (nếu chưa có)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS room_price numeric DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_cost numeric DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electric_cost numeric DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS water_cost numeric DEFAULT 0;
