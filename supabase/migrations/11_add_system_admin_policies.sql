-- Tạo RLS bypass cho organizations để system_admin có thể thấy toàn bộ
CREATE POLICY "System Admin đọc/ghi tất cả organizations" ON "public"."organizations"
FOR ALL USING (
  'system_admin' = (SELECT role FROM public.users WHERE email = auth.jwt() ->> 'email' LIMIT 1)
);

-- Tạo RLS bypass cho users để system_admin có thể quản lý người dùng
CREATE POLICY "System Admin đọc/ghi tất cả users" ON "public"."users"
FOR ALL USING (
  'system_admin' = (SELECT role FROM public.users WHERE email = auth.jwt() ->> 'email' LIMIT 1)
);
