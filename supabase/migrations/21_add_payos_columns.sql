ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS payos_client_id text,
ADD COLUMN IF NOT EXISTS payos_api_key text,
ADD COLUMN IF NOT EXISTS payos_checksum_key text;
