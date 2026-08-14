CREATE TABLE IF NOT EXISTS public.tenant_ratings (
    id SERIAL PRIMARY KEY,
    identity_number VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    organization_id INT NOT NULL REFERENCES public.organizations(id),
    rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_ratings_identity ON public.tenant_ratings(identity_number);
CREATE INDEX idx_tenant_ratings_phone ON public.tenant_ratings(phone);
