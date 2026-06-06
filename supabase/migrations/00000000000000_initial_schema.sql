


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."enum_audit_logs_action" AS ENUM (
    'create',
    'update',
    'delete',
    'login'
);


ALTER TYPE "public"."enum_audit_logs_action" OWNER TO "postgres";


CREATE TYPE "public"."enum_branches_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."enum_branches_status" OWNER TO "postgres";


CREATE TYPE "public"."enum_contracts_status" AS ENUM (
    'active',
    'expired',
    'terminated'
);


ALTER TYPE "public"."enum_contracts_status" OWNER TO "postgres";


CREATE TYPE "public"."enum_device_tokens_platform" AS ENUM (
    'ios',
    'android',
    'web'
);


ALTER TYPE "public"."enum_device_tokens_platform" OWNER TO "postgres";


CREATE TYPE "public"."enum_invoices_payment_status" AS ENUM (
    'unpaid',
    'partial',
    'paid'
);


ALTER TYPE "public"."enum_invoices_payment_status" OWNER TO "postgres";


CREATE TYPE "public"."enum_maintenance_tickets_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."enum_maintenance_tickets_priority" OWNER TO "postgres";


CREATE TYPE "public"."enum_maintenance_tickets_status" AS ENUM (
    'pending',
    'in-progress',
    'resolved'
);


ALTER TYPE "public"."enum_maintenance_tickets_status" OWNER TO "postgres";


CREATE TYPE "public"."enum_notifications_type" AS ENUM (
    'invoice',
    'maintenance',
    'system'
);


ALTER TYPE "public"."enum_notifications_type" OWNER TO "postgres";


CREATE TYPE "public"."enum_otp_verifications_purpose" AS ENUM (
    'login',
    'register'
);


ALTER TYPE "public"."enum_otp_verifications_purpose" OWNER TO "postgres";


CREATE TYPE "public"."enum_rooms_status" AS ENUM (
    'available',
    'occupied',
    'maintenance'
);


ALTER TYPE "public"."enum_rooms_status" OWNER TO "postgres";


CREATE TYPE "public"."enum_users_role" AS ENUM (
    'super_admin',
    'manager',
    'tenant'
);


ALTER TYPE "public"."enum_users_role" OWNER TO "postgres";


CREATE TYPE "public"."enum_utility_anomalies_severity" AS ENUM (
    'warning',
    'critical'
);


ALTER TYPE "public"."enum_utility_anomalies_severity" OWNER TO "postgres";


CREATE TYPE "public"."enum_utility_anomalies_type" AS ENUM (
    'electric',
    'water'
);


ALTER TYPE "public"."enum_utility_anomalies_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_branch_id"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT branch_id 
  FROM public.users 
  WHERE email = (SELECT auth.jwt() ->> 'email');
$$;


ALTER FUNCTION "public"."get_my_branch_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT role 
  FROM public.users 
  WHERE email = (SELECT auth.jwt() ->> 'email');
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_user_id"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT id 
  FROM public.users 
  WHERE email = (SELECT auth.jwt() ->> 'email');
$$;


ALTER FUNCTION "public"."get_my_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" integer NOT NULL,
    "user_id" integer,
    "action" "public"."enum_audit_logs_action" NOT NULL,
    "entity_type" character varying,
    "entity_id" character varying,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "address" character varying,
    "phone" character varying,
    "description" character varying,
    "status" "public"."enum_branches_status" DEFAULT 'active'::"public"."enum_branches_status",
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."branches_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."branches_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."branches_id_seq" OWNED BY "public"."branches"."id";



CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" integer NOT NULL,
    "contract_code" character varying NOT NULL,
    "tenant_id" integer NOT NULL,
    "room_id" integer NOT NULL,
    "start_date" timestamp(3) with time zone NOT NULL,
    "end_date" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "deposit_amount" numeric,
    "monthly_price" numeric,
    "status" "public"."enum_contracts_status" DEFAULT 'active'::"public"."enum_contracts_status",
    "contract_images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."contracts"."contract_images" IS 'Danh sách URL ảnh hợp đồng giấy (Cloudinary)';



CREATE SEQUENCE IF NOT EXISTS "public"."contracts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."contracts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."contracts_id_seq" OWNED BY "public"."contracts"."id";



CREATE TABLE IF NOT EXISTS "public"."contracts_images" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" character varying NOT NULL,
    "image_id" integer NOT NULL,
    "page_number" numeric
);


ALTER TABLE "public"."contracts_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_tokens" (
    "id" integer NOT NULL,
    "token" character varying NOT NULL,
    "user_id" integer,
    "tenant_id" integer,
    "platform" "public"."enum_device_tokens_platform",
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."device_tokens" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."device_tokens_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."device_tokens_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."device_tokens_id_seq" OWNED BY "public"."device_tokens"."id";



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" integer NOT NULL,
    "tenant_id" integer,
    "qr_payload" character varying,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "invoice_code" character varying NOT NULL,
    "room_id" integer NOT NULL,
    "utility_log_id" integer,
    "room_price" numeric NOT NULL,
    "electric_cost" numeric,
    "water_cost" numeric,
    "service_cost" numeric,
    "total_amount" numeric NOT NULL,
    "payment_status" "public"."enum_invoices_payment_status" DEFAULT 'unpaid'::"public"."enum_invoices_payment_status",
    "issued_at" timestamp(3) with time zone,
    "paid_at" timestamp(3) with time zone,
    "checkout_url" character varying,
    "electric_old" double precision,
    "electric_new" double precision,
    "water_old" double precision,
    "water_new" double precision,
    "checkoutUrl" "text",
    "qrPayload" "text",
    "payment_link_id" "text",
    "payment_account_number" "text",
    "payment_account_name" "text",
    "payment_bank_bin" "text",
    "payment_description" "text"
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."invoices_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoices_id_seq" OWNED BY "public"."invoices"."id";



CREATE TABLE IF NOT EXISTS "public"."maintenance_tickets" (
    "id" integer NOT NULL,
    "title" character varying NOT NULL,
    "description" character varying NOT NULL,
    "status" "public"."enum_maintenance_tickets_status" DEFAULT 'pending'::"public"."enum_maintenance_tickets_status",
    "tenant_id" integer,
    "room_id" integer NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "priority" "public"."enum_maintenance_tickets_priority" DEFAULT 'medium'::"public"."enum_maintenance_tickets_priority",
    "assigned_manager_id" integer,
    "images" "text"[] DEFAULT ARRAY[]::"text"[]
);


ALTER TABLE "public"."maintenance_tickets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."maintenance_tickets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."maintenance_tickets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."maintenance_tickets_id_seq" OWNED BY "public"."maintenance_tickets"."id";



CREATE TABLE IF NOT EXISTS "public"."maintenance_tickets_images" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" character varying NOT NULL,
    "image_id" integer NOT NULL
);


ALTER TABLE "public"."maintenance_tickets_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" integer,
    "tenant_id" integer,
    "title" character varying(255) NOT NULL,
    "description" "text" NOT NULL,
    "price" numeric DEFAULT 0 NOT NULL,
    "images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" character varying(50) DEFAULT 'pending_approval'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "marketplace_posts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending_approval'::character varying, 'active'::character varying, 'rejected'::character varying, 'sold'::character varying])::"text"[])))
);


ALTER TABLE "public"."marketplace_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" integer NOT NULL,
    "alt" character varying NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "url" character varying,
    "thumbnail_u_r_l" character varying,
    "filename" character varying,
    "mime_type" character varying,
    "filesize" numeric,
    "width" numeric,
    "height" numeric,
    "focal_x" numeric,
    "focal_y" numeric,
    "cloudinary_url" character varying,
    "cloudinary_public_id" character varying
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."media_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."media_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."media_id_seq" OWNED BY "public"."media"."id";



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "title" character varying NOT NULL,
    "body" character varying,
    "type" "public"."enum_notifications_type",
    "is_read" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notifications_id_seq" OWNED BY "public"."notifications"."id";



CREATE TABLE IF NOT EXISTS "public"."otp_verifications" (
    "id" integer NOT NULL,
    "phone" character varying NOT NULL,
    "otp_code" character varying NOT NULL,
    "purpose" "public"."enum_otp_verifications_purpose" DEFAULT 'login'::"public"."enum_otp_verifications_purpose",
    "expired_at" timestamp(3) with time zone NOT NULL,
    "verified_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."otp_verifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."otp_verifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."otp_verifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."otp_verifications_id_seq" OWNED BY "public"."otp_verifications"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_kv" (
    "id" integer NOT NULL,
    "key" character varying NOT NULL,
    "data" "jsonb" NOT NULL
);


ALTER TABLE "public"."payload_kv" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_kv_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_kv_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_kv_id_seq" OWNED BY "public"."payload_kv"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_locked_documents" (
    "id" integer NOT NULL,
    "global_slug" character varying,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payload_locked_documents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_locked_documents_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_locked_documents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_locked_documents_id_seq" OWNED BY "public"."payload_locked_documents"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_locked_documents_rels" (
    "id" integer NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" character varying NOT NULL,
    "users_id" integer,
    "media_id" integer,
    "rooms_id" integer,
    "tenants_id" integer,
    "invoices_id" integer,
    "contracts_id" integer,
    "maintenance_tickets_id" integer,
    "branches_id" integer,
    "device_tokens_id" integer,
    "otp_verifications_id" integer,
    "utility_logs_id" integer,
    "utility_anomalies_id" integer,
    "payments_id" integer,
    "notifications_id" integer,
    "audit_logs_id" integer
);


ALTER TABLE "public"."payload_locked_documents_rels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_locked_documents_rels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_locked_documents_rels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_locked_documents_rels_id_seq" OWNED BY "public"."payload_locked_documents_rels"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_migrations" (
    "id" integer NOT NULL,
    "name" character varying,
    "batch" numeric,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payload_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_migrations_id_seq" OWNED BY "public"."payload_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_preferences" (
    "id" integer NOT NULL,
    "key" character varying,
    "value" "jsonb",
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payload_preferences" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_preferences_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_preferences_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_preferences_id_seq" OWNED BY "public"."payload_preferences"."id";



CREATE TABLE IF NOT EXISTS "public"."payload_preferences_rels" (
    "id" integer NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" character varying NOT NULL,
    "users_id" integer
);


ALTER TABLE "public"."payload_preferences_rels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payload_preferences_rels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payload_preferences_rels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payload_preferences_rels_id_seq" OWNED BY "public"."payload_preferences_rels"."id";



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" integer NOT NULL,
    "invoice_id" integer NOT NULL,
    "bank_code" character varying,
    "transaction_code" character varying,
    "amount" numeric NOT NULL,
    "paid_at" timestamp(3) with time zone NOT NULL,
    "raw_payload" "jsonb",
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payments_id_seq" OWNED BY "public"."payments"."id";



CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" integer NOT NULL,
    "status" "public"."enum_rooms_status" DEFAULT 'available'::"public"."enum_rooms_status",
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "branch_id" integer NOT NULL,
    "room_code" character varying NOT NULL,
    "floor" numeric,
    "area" numeric,
    "base_price" numeric NOT NULL,
    "electric_price" numeric,
    "water_price" numeric
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."rooms_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."rooms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."rooms_id_seq" OWNED BY "public"."rooms"."id";



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" integer NOT NULL,
    "room_id" integer NOT NULL,
    "id_card_image_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "user_id" integer NOT NULL,
    "identity_number" character varying NOT NULL,
    "emergency_contact" character varying,
    "move_in_date" timestamp(3) with time zone NOT NULL,
    "move_out_date" timestamp(3) with time zone
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."tenants_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tenants_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tenants_id_seq" OWNED BY "public"."tenants"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" integer NOT NULL,
    "full_name" character varying,
    "role" "public"."enum_users_role" DEFAULT 'tenant'::"public"."enum_users_role" NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "email" character varying NOT NULL,
    "reset_password_token" character varying,
    "reset_password_expiration" timestamp(3) with time zone,
    "salt" character varying,
    "hash" character varying,
    "login_attempts" numeric DEFAULT 0,
    "lock_until" timestamp(3) with time zone,
    "phone" character varying,
    "branch_id" integer,
    "status" "text" DEFAULT 'active'::"text" NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_id_seq" OWNED BY "public"."users"."id";



CREATE TABLE IF NOT EXISTS "public"."users_sessions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" character varying NOT NULL,
    "created_at" timestamp(3) with time zone,
    "expires_at" timestamp(3) with time zone NOT NULL
);


ALTER TABLE "public"."users_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."utility_anomalies" (
    "id" integer NOT NULL,
    "utility_log_id" integer NOT NULL,
    "type" "public"."enum_utility_anomalies_type" NOT NULL,
    "severity" "public"."enum_utility_anomalies_severity" NOT NULL,
    "message" character varying,
    "resolved" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."utility_anomalies" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."utility_anomalies_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."utility_anomalies_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."utility_anomalies_id_seq" OWNED BY "public"."utility_anomalies"."id";



CREATE TABLE IF NOT EXISTS "public"."utility_logs" (
    "id" integer NOT NULL,
    "room_id" integer NOT NULL,
    "month" numeric NOT NULL,
    "year" numeric NOT NULL,
    "electric_old" numeric NOT NULL,
    "electric_new" numeric NOT NULL,
    "electric_usage" numeric,
    "water_old" numeric NOT NULL,
    "water_new" numeric NOT NULL,
    "water_usage" numeric,
    "recorded_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "ai_analysis" "jsonb"
);


ALTER TABLE "public"."utility_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."utility_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."utility_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."utility_logs_id_seq" OWNED BY "public"."utility_logs"."id";



ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."branches" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."branches_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."contracts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."contracts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."device_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."device_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."invoices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."invoices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."maintenance_tickets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."maintenance_tickets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."media" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."media_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."otp_verifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."otp_verifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_kv" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_kv_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_locked_documents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_locked_documents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_locked_documents_rels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_locked_documents_rels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_preferences" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_preferences_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payload_preferences_rels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payload_preferences_rels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."rooms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."rooms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tenants" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tenants_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."utility_anomalies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."utility_anomalies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."utility_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."utility_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts_images"
    ADD CONSTRAINT "contracts_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_tickets_images"
    ADD CONSTRAINT "maintenance_tickets_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_tickets"
    ADD CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_posts"
    ADD CONSTRAINT "marketplace_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otp_verifications"
    ADD CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_kv"
    ADD CONSTRAINT "payload_kv_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_locked_documents"
    ADD CONSTRAINT "payload_locked_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_migrations"
    ADD CONSTRAINT "payload_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_preferences"
    ADD CONSTRAINT "payload_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payload_preferences_rels"
    ADD CONSTRAINT "payload_preferences_rels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users_sessions"
    ADD CONSTRAINT "users_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."utility_anomalies"
    ADD CONSTRAINT "utility_anomalies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."utility_logs"
    ADD CONSTRAINT "utility_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "audit_logs_updated_at_idx" ON "public"."audit_logs" USING "btree" ("updated_at");



CREATE INDEX "audit_logs_user_idx" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "branches_created_at_idx" ON "public"."branches" USING "btree" ("created_at");



CREATE INDEX "branches_created_by_idx" ON "public"."branches" USING "btree" ("created_by_id");



CREATE INDEX "branches_updated_at_idx" ON "public"."branches" USING "btree" ("updated_at");



CREATE INDEX "contracts_created_at_idx" ON "public"."contracts" USING "btree" ("created_at");



CREATE INDEX "contracts_images_image_idx" ON "public"."contracts_images" USING "btree" ("image_id");



CREATE INDEX "contracts_images_order_idx" ON "public"."contracts_images" USING "btree" ("_order");



CREATE INDEX "contracts_images_parent_id_idx" ON "public"."contracts_images" USING "btree" ("_parent_id");



CREATE INDEX "contracts_room_idx" ON "public"."contracts" USING "btree" ("room_id");



CREATE INDEX "contracts_tenant_idx" ON "public"."contracts" USING "btree" ("tenant_id");



CREATE INDEX "contracts_updated_at_idx" ON "public"."contracts" USING "btree" ("updated_at");



CREATE INDEX "device_tokens_created_at_idx" ON "public"."device_tokens" USING "btree" ("created_at");



CREATE INDEX "device_tokens_tenant_idx" ON "public"."device_tokens" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "device_tokens_token_idx" ON "public"."device_tokens" USING "btree" ("token");



CREATE INDEX "device_tokens_updated_at_idx" ON "public"."device_tokens" USING "btree" ("updated_at");



CREATE INDEX "device_tokens_user_idx" ON "public"."device_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_marketplace_posts_branch_id" ON "public"."marketplace_posts" USING "btree" ("branch_id");



CREATE INDEX "idx_marketplace_posts_status" ON "public"."marketplace_posts" USING "btree" ("status");



CREATE INDEX "invoices_created_at_idx" ON "public"."invoices" USING "btree" ("created_at");



CREATE INDEX "invoices_room_idx" ON "public"."invoices" USING "btree" ("room_id");



CREATE INDEX "invoices_tenant_idx" ON "public"."invoices" USING "btree" ("tenant_id");



CREATE INDEX "invoices_updated_at_idx" ON "public"."invoices" USING "btree" ("updated_at");



CREATE INDEX "invoices_utility_log_idx" ON "public"."invoices" USING "btree" ("utility_log_id");



CREATE INDEX "maintenance_tickets_assigned_manager_idx" ON "public"."maintenance_tickets" USING "btree" ("assigned_manager_id");



CREATE INDEX "maintenance_tickets_created_at_idx" ON "public"."maintenance_tickets" USING "btree" ("created_at");



CREATE INDEX "maintenance_tickets_images_image_idx" ON "public"."maintenance_tickets_images" USING "btree" ("image_id");



CREATE INDEX "maintenance_tickets_images_order_idx" ON "public"."maintenance_tickets_images" USING "btree" ("_order");



CREATE INDEX "maintenance_tickets_images_parent_id_idx" ON "public"."maintenance_tickets_images" USING "btree" ("_parent_id");



CREATE INDEX "maintenance_tickets_room_idx" ON "public"."maintenance_tickets" USING "btree" ("room_id");



CREATE INDEX "maintenance_tickets_tenant_idx" ON "public"."maintenance_tickets" USING "btree" ("tenant_id");



CREATE INDEX "maintenance_tickets_updated_at_idx" ON "public"."maintenance_tickets" USING "btree" ("updated_at");



CREATE INDEX "media_created_at_idx" ON "public"."media" USING "btree" ("created_at");



CREATE UNIQUE INDEX "media_filename_idx" ON "public"."media" USING "btree" ("filename");



CREATE INDEX "media_updated_at_idx" ON "public"."media" USING "btree" ("updated_at");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "notifications_updated_at_idx" ON "public"."notifications" USING "btree" ("updated_at");



CREATE INDEX "notifications_user_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "otp_verifications_created_at_idx" ON "public"."otp_verifications" USING "btree" ("created_at");



CREATE INDEX "otp_verifications_phone_idx" ON "public"."otp_verifications" USING "btree" ("phone");



CREATE INDEX "otp_verifications_updated_at_idx" ON "public"."otp_verifications" USING "btree" ("updated_at");



CREATE UNIQUE INDEX "payload_kv_key_idx" ON "public"."payload_kv" USING "btree" ("key");



CREATE INDEX "payload_locked_documents_created_at_idx" ON "public"."payload_locked_documents" USING "btree" ("created_at");



CREATE INDEX "payload_locked_documents_global_slug_idx" ON "public"."payload_locked_documents" USING "btree" ("global_slug");



CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("audit_logs_id");



CREATE INDEX "payload_locked_documents_rels_branches_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("branches_id");



CREATE INDEX "payload_locked_documents_rels_contracts_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("contracts_id");



CREATE INDEX "payload_locked_documents_rels_device_tokens_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("device_tokens_id");



CREATE INDEX "payload_locked_documents_rels_invoices_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("invoices_id");



CREATE INDEX "payload_locked_documents_rels_maintenance_tickets_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("maintenance_tickets_id");



CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("media_id");



CREATE INDEX "payload_locked_documents_rels_notifications_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("notifications_id");



CREATE INDEX "payload_locked_documents_rels_order_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("order");



CREATE INDEX "payload_locked_documents_rels_otp_verifications_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("otp_verifications_id");



CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("parent_id");



CREATE INDEX "payload_locked_documents_rels_path_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("path");



CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("payments_id");



CREATE INDEX "payload_locked_documents_rels_rooms_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("rooms_id");



CREATE INDEX "payload_locked_documents_rels_tenants_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("tenants_id");



CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("users_id");



CREATE INDEX "payload_locked_documents_rels_utility_anomalies_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("utility_anomalies_id");



CREATE INDEX "payload_locked_documents_rels_utility_logs_id_idx" ON "public"."payload_locked_documents_rels" USING "btree" ("utility_logs_id");



CREATE INDEX "payload_locked_documents_updated_at_idx" ON "public"."payload_locked_documents" USING "btree" ("updated_at");



CREATE INDEX "payload_migrations_created_at_idx" ON "public"."payload_migrations" USING "btree" ("created_at");



CREATE INDEX "payload_migrations_updated_at_idx" ON "public"."payload_migrations" USING "btree" ("updated_at");



CREATE INDEX "payload_preferences_created_at_idx" ON "public"."payload_preferences" USING "btree" ("created_at");



CREATE INDEX "payload_preferences_key_idx" ON "public"."payload_preferences" USING "btree" ("key");



CREATE INDEX "payload_preferences_rels_order_idx" ON "public"."payload_preferences_rels" USING "btree" ("order");



CREATE INDEX "payload_preferences_rels_parent_idx" ON "public"."payload_preferences_rels" USING "btree" ("parent_id");



CREATE INDEX "payload_preferences_rels_path_idx" ON "public"."payload_preferences_rels" USING "btree" ("path");



CREATE INDEX "payload_preferences_rels_users_id_idx" ON "public"."payload_preferences_rels" USING "btree" ("users_id");



CREATE INDEX "payload_preferences_updated_at_idx" ON "public"."payload_preferences" USING "btree" ("updated_at");



CREATE INDEX "payments_created_at_idx" ON "public"."payments" USING "btree" ("created_at");



CREATE INDEX "payments_invoice_idx" ON "public"."payments" USING "btree" ("invoice_id");



CREATE UNIQUE INDEX "payments_transaction_code_idx" ON "public"."payments" USING "btree" ("transaction_code");



CREATE INDEX "payments_updated_at_idx" ON "public"."payments" USING "btree" ("updated_at");



CREATE INDEX "rooms_branch_idx" ON "public"."rooms" USING "btree" ("branch_id");



CREATE INDEX "rooms_created_at_idx" ON "public"."rooms" USING "btree" ("created_at");



CREATE INDEX "rooms_updated_at_idx" ON "public"."rooms" USING "btree" ("updated_at");



CREATE INDEX "tenants_created_at_idx" ON "public"."tenants" USING "btree" ("created_at");



CREATE INDEX "tenants_id_card_image_idx" ON "public"."tenants" USING "btree" ("id_card_image_id");



CREATE INDEX "tenants_room_idx" ON "public"."tenants" USING "btree" ("room_id");



CREATE INDEX "tenants_updated_at_idx" ON "public"."tenants" USING "btree" ("updated_at");



CREATE INDEX "tenants_user_idx" ON "public"."tenants" USING "btree" ("user_id");



CREATE INDEX "users_branch_idx" ON "public"."users" USING "btree" ("branch_id");



CREATE INDEX "users_created_at_idx" ON "public"."users" USING "btree" ("created_at");



CREATE UNIQUE INDEX "users_email_idx" ON "public"."users" USING "btree" ("email");



CREATE UNIQUE INDEX "users_phone_idx" ON "public"."users" USING "btree" ("phone");



CREATE INDEX "users_sessions_order_idx" ON "public"."users_sessions" USING "btree" ("_order");



CREATE INDEX "users_sessions_parent_id_idx" ON "public"."users_sessions" USING "btree" ("_parent_id");



CREATE INDEX "users_updated_at_idx" ON "public"."users" USING "btree" ("updated_at");



CREATE INDEX "utility_anomalies_created_at_idx" ON "public"."utility_anomalies" USING "btree" ("created_at");



CREATE INDEX "utility_anomalies_updated_at_idx" ON "public"."utility_anomalies" USING "btree" ("updated_at");



CREATE INDEX "utility_anomalies_utility_log_idx" ON "public"."utility_anomalies" USING "btree" ("utility_log_id");



CREATE INDEX "utility_logs_created_at_idx" ON "public"."utility_logs" USING "btree" ("created_at");



CREATE INDEX "utility_logs_recorded_by_idx" ON "public"."utility_logs" USING "btree" ("recorded_by_id");



CREATE INDEX "utility_logs_room_idx" ON "public"."utility_logs" USING "btree" ("room_id");



CREATE INDEX "utility_logs_updated_at_idx" ON "public"."utility_logs" USING "btree" ("updated_at");



CREATE OR REPLACE TRIGGER "trg_marketplace_posts_updated_at" BEFORE UPDATE ON "public"."marketplace_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts_images"
    ADD CONSTRAINT "contracts_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts_images"
    ADD CONSTRAINT "contracts_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."device_tokens"
    ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_utility_log_id_utility_logs_id_fk" FOREIGN KEY ("utility_log_id") REFERENCES "public"."utility_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_tickets"
    ADD CONSTRAINT "maintenance_tickets_assigned_manager_id_users_id_fk" FOREIGN KEY ("assigned_manager_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_tickets_images"
    ADD CONSTRAINT "maintenance_tickets_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_tickets_images"
    ADD CONSTRAINT "maintenance_tickets_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."maintenance_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_tickets"
    ADD CONSTRAINT "maintenance_tickets_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_tickets"
    ADD CONSTRAINT "maintenance_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketplace_posts"
    ADD CONSTRAINT "marketplace_posts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketplace_posts"
    ADD CONSTRAINT "marketplace_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_branches_fk" FOREIGN KEY ("branches_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_contracts_fk" FOREIGN KEY ("contracts_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_device_tokens_fk" FOREIGN KEY ("device_tokens_id") REFERENCES "public"."device_tokens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_invoices_fk" FOREIGN KEY ("invoices_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_maintenance_tickets_fk" FOREIGN KEY ("maintenance_tickets_id") REFERENCES "public"."maintenance_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_otp_verifications_fk" FOREIGN KEY ("otp_verifications_id") REFERENCES "public"."otp_verifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_rooms_fk" FOREIGN KEY ("rooms_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_utility_anomalies_fk" FOREIGN KEY ("utility_anomalies_id") REFERENCES "public"."utility_anomalies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_utility_logs_fk" FOREIGN KEY ("utility_logs_id") REFERENCES "public"."utility_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_preferences_rels"
    ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payload_preferences_rels"
    ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_id_card_image_id_media_id_fk" FOREIGN KEY ("id_card_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users_sessions"
    ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."utility_anomalies"
    ADD CONSTRAINT "utility_anomalies_utility_log_id_utility_logs_id_fk" FOREIGN KEY ("utility_log_id") REFERENCES "public"."utility_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."utility_logs"
    ADD CONSTRAINT "utility_logs_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."utility_logs"
    ADD CONSTRAINT "utility_logs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



CREATE POLICY "Cho phép đọc users khi đã đăng nhập" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Từ chối tất cả truy cập trực tiếp" ON "public"."invoices" TO "authenticated" USING (false);



ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."utility_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."marketplace_posts";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_my_branch_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_branch_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_branch_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON SEQUENCE "public"."branches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."branches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."branches_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contracts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contracts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contracts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contracts_images" TO "anon";
GRANT ALL ON TABLE "public"."contracts_images" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts_images" TO "service_role";



GRANT ALL ON TABLE "public"."device_tokens" TO "anon";
GRANT ALL ON TABLE "public"."device_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."device_tokens" TO "service_role";



GRANT ALL ON SEQUENCE "public"."device_tokens_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_tokens_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_tokens_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_tickets" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_tickets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."maintenance_tickets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."maintenance_tickets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."maintenance_tickets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_tickets_images" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_tickets_images" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_tickets_images" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_posts" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_posts" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON SEQUENCE "public"."media_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."media_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."media_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."otp_verifications" TO "anon";
GRANT ALL ON TABLE "public"."otp_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_verifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."otp_verifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."otp_verifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."otp_verifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_kv" TO "anon";
GRANT ALL ON TABLE "public"."payload_kv" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_kv" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_kv_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_kv_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_kv_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_locked_documents" TO "anon";
GRANT ALL ON TABLE "public"."payload_locked_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_locked_documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_locked_documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_locked_documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_locked_documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_locked_documents_rels" TO "anon";
GRANT ALL ON TABLE "public"."payload_locked_documents_rels" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_locked_documents_rels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_locked_documents_rels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_locked_documents_rels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_locked_documents_rels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_migrations" TO "anon";
GRANT ALL ON TABLE "public"."payload_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_preferences" TO "anon";
GRANT ALL ON TABLE "public"."payload_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_preferences" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_preferences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_preferences_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_preferences_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payload_preferences_rels" TO "anon";
GRANT ALL ON TABLE "public"."payload_preferences_rels" TO "authenticated";
GRANT ALL ON TABLE "public"."payload_preferences_rels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payload_preferences_rels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payload_preferences_rels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payload_preferences_rels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tenants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tenants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tenants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users_sessions" TO "anon";
GRANT ALL ON TABLE "public"."users_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."users_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."utility_anomalies" TO "anon";
GRANT ALL ON TABLE "public"."utility_anomalies" TO "authenticated";
GRANT ALL ON TABLE "public"."utility_anomalies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."utility_anomalies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."utility_anomalies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."utility_anomalies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."utility_logs" TO "anon";
GRANT ALL ON TABLE "public"."utility_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."utility_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."utility_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."utility_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."utility_logs_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































