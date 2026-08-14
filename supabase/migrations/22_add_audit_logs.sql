-- Bảng Audit Logs
DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    record_id text NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    changed_by integer REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho bảng audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin có thể xem log của organization mình
CREATE POLICY "audit_logs_isolation_policy" ON public.audit_logs
FOR SELECT TO authenticated USING (
   (public.get_user_role() = 'super_admin' AND changed_by IN (
       SELECT id FROM public.users WHERE organization_id = public.get_user_org_id()
   ))
   OR
   (public.get_user_role() = 'master_admin')
);

-- Hàm xử lý Trigger để ghi log tự động
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id integer;
BEGIN
    -- Lấy ID người dùng đang thao tác từ JWT (nếu đang ở context authenticated)
    BEGIN
        v_user_id := public.get_user_db_id();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', row_to_json(OLD)::jsonb, v_user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, v_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', row_to_json(NEW)::jsonb, v_user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn Trigger vào các bảng nghiệp vụ chính
DROP TRIGGER IF EXISTS audit_rooms_trigger ON public.rooms;
CREATE TRIGGER audit_rooms_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_tenants_trigger ON public.tenants;
CREATE TRIGGER audit_tenants_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_invoices_trigger ON public.invoices;
CREATE TRIGGER audit_invoices_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_branches_trigger ON public.branches;
CREATE TRIGGER audit_branches_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
