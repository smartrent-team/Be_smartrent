-- Thêm role system_admin vào enum
ALTER TYPE "public"."enum_users_role" ADD VALUE IF NOT EXISTS 'system_admin';
