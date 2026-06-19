-- ==============================================================================
-- BỔ SUNG DATABASE INDEXES ĐỂ TỐI ƯU HIỆU NĂNG QUERY
-- Cải thiện tốc độ các query có JOIN hoặc WHERE trên khóa ngoại và các trạng thái
-- ==============================================================================

-- 1. Index cho bảng rooms
CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON rooms(branch_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 2. Index cho bảng tenants
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_room_id ON tenants(room_id);

-- 3. Index cho bảng invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_room_id ON invoices(room_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- 4. Index cho bảng contracts
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_room_id ON contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- 5. Index cho bảng maintenance_tickets
CREATE INDEX IF NOT EXISTS idx_tickets_room_id ON maintenance_tickets(room_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON maintenance_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON maintenance_tickets(status);

-- 6. Index cho bảng users
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
