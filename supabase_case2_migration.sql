-- Migration: Thêm cột invoice_type và notes vào bảng invoices
-- Phục vụ cho hóa đơn cuối hợp đồng (Case 2: Hết hạn hợp đồng)

-- 1. Thêm cột invoice_type (monthly = hóa đơn hàng tháng, final = hóa đơn cuối hợp đồng)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (invoice_type IN ('monthly', 'final'));

-- 2. Thêm cột notes (ghi chú về tiền cọc, lý do đặc biệt...)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Thêm cột 'confirmed' vào checkout_requests status nếu chưa có
-- (Bảng đang dùng CHECK constraint, cần update hoặc drop rồi tạo lại)
-- Nếu cột status của checkout_requests là TEXT (không phải ENUM), thì chỉ cần update CHECK:
-- Xóa constraint cũ và thêm constraint mới với 'confirmed' và 'invoiced'
DO $$
BEGIN
  -- Xóa constraint status cũ trên checkout_requests nếu tồn tại
  ALTER TABLE checkout_requests DROP CONSTRAINT IF EXISTS checkout_requests_status_check;

  -- Thêm constraint mới bao gồm 'confirmed' và 'invoiced'
  ALTER TABLE checkout_requests ADD CONSTRAINT checkout_requests_status_check
    CHECK (status IN (
      'requested',
      'confirmed',
      'invoiced',
      'inspecting',
      'pending_settlement',
      'pending_tenant_confirmation',
      'completed',
      'disputed',
      'cancelled'
    ));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Lỗi khi cập nhật constraint checkout_requests: %', SQLERRM;
END;
$$;

-- 4. Thêm cột completed_at cho checkout_requests nếu chưa có
ALTER TABLE checkout_requests
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 5. Thêm index để tìm kiếm hóa đơn cuối nhanh hơn
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_type ON invoices(tenant_id, invoice_type);
