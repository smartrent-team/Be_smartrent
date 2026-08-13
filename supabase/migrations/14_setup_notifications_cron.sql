-- =============================================================================
-- Migration 14: Thiết lập pg_cron để tự động kích hoạt notification jobs
-- =============================================================================
-- Yêu cầu: pg_cron extension đã được bật trong Supabase project
--   (Database → Extensions → pg_cron)
--
-- Cron chạy mỗi ngày lúc 01:00 UTC = 08:00 SA giờ Việt Nam (UTC+7)
-- Gọi Next.js API endpoint /api/internal/notifications-cron với Bearer token.
--
-- Biến cần thiết trước khi chạy migration này:
--   - APP_BASE_URL : URL của Next.js app (vd: https://yourdomain.com)
--   - INTERNAL_CRON_SECRET : secret token, phải khớp với env var cùng tên
--
-- Thay thế 2 placeholder bên dưới trước khi chạy.
-- =============================================================================

-- Bật extension pg_cron (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Bật extension http để gọi HTTP từ pg_cron
CREATE EXTENSION IF NOT EXISTS http;

-- Xóa job cũ nếu đã tồn tại (idempotent)
SELECT cron.unschedule('smartrent_daily_notifications')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'smartrent_daily_notifications'
);

-- Tạo cron job mới: chạy mỗi ngày lúc 01:00 UTC (08:00 SA VN)
SELECT cron.schedule(
  'smartrent_daily_notifications',
  '0 1 * * *',
  $$
  SELECT http_post(
    'https://YOUR_APP_BASE_URL/api/internal/notifications-cron',
    '{}',
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer YOUR_INTERNAL_CRON_SECRET')
    ]
  );
  $$
);

-- Kiểm tra job đã được tạo
SELECT jobid, jobname, schedule, command FROM cron.job
WHERE jobname = 'smartrent_daily_notifications';
