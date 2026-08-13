-- =======================================================
-- CHECKOUT WORKFLOW MIGRATION (FIX UUID TYPE ERROR)
-- Chạy script này trong Supabase SQL Editor để sửa lỗi UUID
-- =======================================================

-- 1. Xóa cột reported_by_id kiểu UUID bị lỗi
ALTER TABLE "maintenance_tickets" DROP COLUMN IF EXISTS "reported_by_id";

-- 2. Tạo lại cột reported_by_id với kiểu TEXT để tương thích với ID dạng số/chữ của bảng users
ALTER TABLE "maintenance_tickets" ADD COLUMN "reported_by_id" TEXT;
