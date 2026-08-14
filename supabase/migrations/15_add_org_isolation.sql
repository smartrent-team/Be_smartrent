-- Migration: Add organization_id to branches for multi-tenant data isolation
-- Mỗi branch phải thuộc về 1 organization (super_admin's org).
-- Điều này cho phép enforce: super_admin chỉ thấy data của organization mình.

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Index để query nhanh hơn
CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON public.branches(organization_id);

-- NOTE: Sau khi chạy migration này, cần UPDATE thủ công các branches hiện có
-- để gán đúng organization_id cho chúng.
-- VD: UPDATE branches SET organization_id = '<org-id>' WHERE id IN (1, 2, 3);
