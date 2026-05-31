-- Lưu URL ảnh hợp đồng (Cloudinary) trên bảng contracts
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS contract_images jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN contracts.contract_images IS 'Danh sách URL ảnh hợp đồng giấy (Cloudinary)';
