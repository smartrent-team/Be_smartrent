-- =============================================================================
-- Migration 16: Fix cột type của bảng notifications
-- =============================================================================
-- Vấn đề: cột type là enum (enum_notifications_type) không chứa các giá trị
--   mới: ticket, invoice, payment, contract, contract_expired,
--   contract_expiring_30d, contract_expiring_7d, invoice_overdue.
--
-- Giải pháp: chuyển cột type sang TEXT để linh hoạt, không cần ALTER ENUM
--   mỗi khi thêm loại thông báo mới.
-- =============================================================================

-- Bước 1: Thêm cột tạm TEXT
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type_text TEXT;

-- Bước 2: Copy dữ liệu cũ sang cột mới
UPDATE notifications
  SET type_text = type::TEXT
  WHERE type_text IS NULL;

-- Bước 3: Xóa cột enum cũ
ALTER TABLE notifications
  DROP COLUMN IF EXISTS type;

-- Bước 4: Đổi tên cột mới thành type
ALTER TABLE notifications
  RENAME COLUMN type_text TO type;

-- Bước 5: Đặt NOT NULL (nếu cần) với default 'system'
ALTER TABLE notifications
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN type SET DEFAULT 'system';

-- Index cho việc query nhanh theo type
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications (user_id, type);
