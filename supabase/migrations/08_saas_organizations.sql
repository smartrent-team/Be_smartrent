-- Tạo bảng organizations
CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" serial PRIMARY KEY,
    "name" character varying NOT NULL,
    "contact_phone" character varying,
    "contact_email" character varying,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "status" character varying DEFAULT 'active' NOT NULL
);

-- Thêm cột organization_id vào bảng users
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "organization_id" integer REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

-- Cập nhật RLS cho bảng organizations
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;

-- Policy: Admin có thể xem/sửa organization của mình
CREATE POLICY "Cho phép đọc/ghi organization theo org_id" ON "public"."organizations"
FOR ALL USING (
  id = (SELECT organization_id FROM public.users WHERE email = auth.jwt() ->> 'email' LIMIT 1)
);
