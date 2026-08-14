-- 1. Add subscription columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_type VARCHAR DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_rooms INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS brand_name VARCHAR,
  ADD COLUMN IF NOT EXISTS brand_logo_url VARCHAR;

-- 2. Create saas_transactions table
CREATE TABLE IF NOT EXISTS public.saas_transactions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id VARCHAR NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- RLS for saas_transactions
ALTER TABLE public.saas_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin read own saas transactions"
  ON public.saas_transactions FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.users WHERE email = auth.jwt() ->> 'email' LIMIT 1));

-- 3. Triggers for Rate-limiting
-- Trigger cho Branches
CREATE OR REPLACE FUNCTION check_org_branch_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_current_branches INTEGER;
  v_max_branches INTEGER;
BEGIN
  -- Lấy max_branches của organization
  SELECT max_branches INTO v_max_branches
  FROM public.organizations
  WHERE id = NEW.organization_id;

  -- Đếm số branches hiện tại
  SELECT count(*) INTO v_current_branches
  FROM public.branches
  WHERE organization_id = NEW.organization_id;

  IF v_current_branches >= v_max_branches THEN
    RAISE EXCEPTION 'Vượt quá giới hạn gói cước. Bạn chỉ được tạo tối đa % chi nhánh. Vui lòng nâng cấp gói cước.', v_max_branches;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_branch_limit ON public.branches;
CREATE TRIGGER trg_check_branch_limit
BEFORE INSERT ON public.branches
FOR EACH ROW EXECUTE FUNCTION check_org_branch_limit();

-- Trigger cho Rooms
CREATE OR REPLACE FUNCTION check_org_room_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_current_rooms INTEGER;
  v_max_rooms INTEGER;
  v_org_id INTEGER;
BEGIN
  -- Tìm organization_id từ branch_id
  SELECT organization_id INTO v_org_id
  FROM public.branches
  WHERE id = NEW.branch_id;

  -- Nếu phòng không gắn branch nào thì cho qua (lý thuyết là không thể nếu db thiết kế chuẩn)
  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lấy max_rooms của organization
  SELECT max_rooms INTO v_max_rooms
  FROM public.organizations
  WHERE id = v_org_id;

  -- Đếm tổng số phòng của TẤT CẢ các branches thuộc organization này
  SELECT count(*) INTO v_current_rooms
  FROM public.rooms r
  JOIN public.branches b ON r.branch_id = b.id
  WHERE b.organization_id = v_org_id;

  IF v_current_rooms >= v_max_rooms THEN
    RAISE EXCEPTION 'Vượt quá giới hạn gói cước. Hệ thống của bạn chỉ được tạo tối đa % phòng. Vui lòng nâng cấp gói cước.', v_max_rooms;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_room_limit ON public.rooms;
CREATE TRIGGER trg_check_room_limit
BEFORE INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION check_org_room_limit();
