-- ==============================================================================
-- PayOS / VietQR payment columns on invoices
-- Run in Supabase Dashboard -> SQL Editor (or: npm run db:migrate-invoices)
-- ==============================================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "checkoutUrl" text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "qrPayload" text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_link_id text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_account_number text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_account_name text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_bank_bin text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_description text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;
