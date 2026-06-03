-- Thêm cột ai_analysis vào bảng utility_logs để lưu trữ kết quả phân tích điện nước từ AI
ALTER TABLE utility_logs ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT NULL;
