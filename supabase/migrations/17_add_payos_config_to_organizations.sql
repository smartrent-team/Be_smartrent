-- Thêm các cột cấu hình PayOS (Multi-tenant) cho bảng organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS payos_client_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payos_api_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS payos_checksum_key VARCHAR(255);

-- (Tùy chọn) Thêm comment cho các cột
COMMENT ON COLUMN public.organizations.payos_client_id IS 'Mã Client ID tài khoản PayOS cá nhân của Tổ chức (Super Admin)';
COMMENT ON COLUMN public.organizations.payos_api_key IS 'Mã API Key tài khoản PayOS cá nhân của Tổ chức (Super Admin)';
COMMENT ON COLUMN public.organizations.payos_checksum_key IS 'Mã Checksum Key tài khoản PayOS cá nhân của Tổ chức (Super Admin)';
