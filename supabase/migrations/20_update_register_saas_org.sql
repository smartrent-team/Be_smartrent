-- Cập nhật lại hàm register_saas_org để hỗ trợ plan_type
CREATE OR REPLACE FUNCTION public.register_saas_org(
  auth_user_id uuid,
  org_name text,
  admin_email text,
  admin_phone text,
  admin_full_name text,
  plan_type text DEFAULT 'free'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id integer;
BEGIN
  -- 1. Create Organization (bảng đã có cột plan_type từ file 16_saas_subscriptions.sql)
  INSERT INTO public.organizations (name, contact_email, contact_phone, plan_type)
  VALUES (org_name, admin_email, admin_phone, plan_type)
  RETURNING id INTO v_org_id;

  -- 2. Create User as super_admin
  INSERT INTO public.users (id, email, full_name, phone, role, organization_id)
  VALUES (auth_user_id, admin_email, admin_full_name, admin_phone, 'super_admin', v_org_id);

  RETURN v_org_id;
END;
$$;
