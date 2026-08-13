-- Invoice due date and manual payment method
-- Run in Supabase Dashboard -> SQL Editor

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_method text;

-- Backfill: hạn thanh toán ngày 10 tháng sau ngày lập
UPDATE invoices
SET due_date = (
  date_trunc('month', issued_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
  + interval '1 month'
  + interval '9 days'
  + interval '23 hours 59 minutes'
)
WHERE due_date IS NULL AND issued_at IS NOT NULL;
