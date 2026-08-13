-- Migration 17: Add vehicle_count column to rooms table
-- vehicle_count dùng để theo dõi số lượng xe của khách trong phòng,
-- phục vụ tính phí giữ xe theo xe/tháng khi tạo hoá đơn dịch vụ.

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS vehicle_count INTEGER DEFAULT 0 CHECK (vehicle_count >= 0);

COMMENT ON COLUMN rooms.vehicle_count IS 'Số lượng xe của khách đang ở trong phòng. Dùng để tính phí giữ xe (xe/tháng).';
