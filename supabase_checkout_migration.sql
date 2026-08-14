-- 1. (Đã bỏ qua) Cột status của bảng contracts trong DB của bạn đang dùng kiểu TEXT
-- thay vì ENUM, nên không cần chạy lệnh ALTER TYPE. Hệ thống sẽ tự động chấp nhận 
-- các chuỗi text trạng thái mới ('inspection', 'pending_settlement', 'moved_out').

-- 2. Bảng checkout_requests: lưu yêu cầu trả phòng
CREATE TABLE IF NOT EXISTS checkout_requests (
  id            BIGSERIAL PRIMARY KEY,
  contract_id   BIGINT NOT NULL REFERENCES contracts(id),
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id),
  room_id       BIGINT NOT NULL REFERENCES rooms(id),
  is_early      BOOLEAN NOT NULL DEFAULT FALSE,
  status        TEXT NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested','inspecting','pending_settlement','pending_tenant_confirmation','completed','disputed','cancelled')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspected_at  TIMESTAMPTZ,
  settled_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- Bật RLS cho checkout_requests
ALTER TABLE checkout_requests ENABLE ROW LEVEL SECURITY;

-- Policy tạm thời (nên tùy chỉnh lại theo RBAC của bạn sau)
CREATE POLICY "Allow all authenticated users to read checkout_requests" ON checkout_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow manager/admin to insert/update checkout_requests" ON checkout_requests FOR ALL USING (auth.role() = 'authenticated');

-- 3. Bảng checkout_settlements: bảng quyết toán cuối
CREATE TABLE IF NOT EXISTS checkout_settlements (
  id                     BIGSERIAL PRIMARY KEY,
  checkout_request_id    BIGINT NOT NULL REFERENCES checkout_requests(id),
  tenant_id              BIGINT NOT NULL REFERENCES tenants(id),
  room_id                BIGINT NOT NULL REFERENCES rooms(id),
  -- Các khoản nợ
  unpaid_rent            INT NOT NULL DEFAULT 0,
  unpaid_electric        INT NOT NULL DEFAULT 0,
  unpaid_water           INT NOT NULL DEFAULT 0,
  unpaid_service         INT NOT NULL DEFAULT 0,
  damage_cost            INT NOT NULL DEFAULT 0,
  other_fees             INT NOT NULL DEFAULT 0,
  total_debt             INT GENERATED ALWAYS AS (
                           unpaid_rent + unpaid_electric + unpaid_water +
                           unpaid_service + damage_cost + other_fees
                         ) STORED,
  -- Tiền cọc
  deposit_amount         INT NOT NULL DEFAULT 0,
  deposit_forfeited      INT NOT NULL DEFAULT 0,
  deposit_used_to_offset INT GENERATED ALWAYS AS (
                           LEAST(deposit_amount - deposit_forfeited, 
                                 unpaid_rent + unpaid_electric + unpaid_water +
                                 unpaid_service + damage_cost + other_fees)
                         ) STORED,
  deposit_refund         INT GENERATED ALWAYS AS (
                           GREATEST(0, deposit_amount - deposit_forfeited - 
                           LEAST(deposit_amount - deposit_forfeited,
                                 unpaid_rent + unpaid_electric + unpaid_water +
                                 unpaid_service + damage_cost + other_fees))
                         ) STORED,
  amount_tenant_owes     INT GENERATED ALWAYS AS (
                           GREATEST(0,
                             unpaid_rent + unpaid_electric + unpaid_water +
                             unpaid_service + damage_cost + other_fees -
                             LEAST(deposit_amount - deposit_forfeited,
                                   unpaid_rent + unpaid_electric + unpaid_water +
                                   unpaid_service + damage_cost + other_fees))
                         ) STORED,
  -- Trạng thái
  status                 TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','pending_tenant_confirmation','confirmed','disputed','completed')),
  admin_notes            TEXT,
  tenant_confirmed_at    TIMESTAMPTZ,
  dispute_reason         TEXT,
  created_by             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ
);

-- Bật RLS cho checkout_settlements
ALTER TABLE checkout_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read checkout_settlements" ON checkout_settlements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow manager/admin to insert/update checkout_settlements" ON checkout_settlements FOR ALL USING (auth.role() = 'authenticated');
