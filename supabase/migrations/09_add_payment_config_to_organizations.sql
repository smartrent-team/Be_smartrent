-- Thêm cấu hình thanh toán cho tổ chức (chủ nhà)
ALTER TABLE "public"."organizations" ADD COLUMN IF NOT EXISTS "payment_bank_bin" character varying;
ALTER TABLE "public"."organizations" ADD COLUMN IF NOT EXISTS "payment_account_number" character varying;
ALTER TABLE "public"."organizations" ADD COLUMN IF NOT EXISTS "payment_account_name" character varying;
