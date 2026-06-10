-- Tạo bảng room_fixtures lưu đồ cố định trong phòng
CREATE TABLE IF NOT EXISTS room_fixtures (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'good', -- ví dụ: 'good', 'broken', 'repairing'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bật RLS
ALTER TABLE room_fixtures ENABLE ROW LEVEL SECURITY;

-- Tạo RLS policies
DROP POLICY IF EXISTS "Cho phép đọc/ghi đồ cố định nếu đã đăng nhập" ON room_fixtures;
CREATE POLICY "Cho phép đọc/ghi đồ cố định nếu đã đăng nhập"
ON room_fixtures
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- index tối ưu
CREATE INDEX IF NOT EXISTS idx_room_fixtures_room_id ON room_fixtures(room_id);
