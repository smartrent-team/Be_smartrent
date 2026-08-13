-- =============================================================================
-- Migration 15: Thêm cột related_id vào bảng notifications
-- =============================================================================
-- related_id dùng để dedup thông báo và liên kết với đối tượng liên quan.
-- Ví dụ: "contract:42", "invoice:7", ...
-- =============================================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_id TEXT DEFAULT NULL;

-- Index để tăng tốc query dedup (user_id, related_id, type)
CREATE INDEX IF NOT EXISTS idx_notifications_related_id
  ON notifications (user_id, related_id, type)
  WHERE related_id IS NOT NULL;
