-- NELVYON QR Code Generator — static & dynamic QRs

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    qr_type TEXT NOT NULL DEFAULT 'url',
    content TEXT NOT NULL DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    short_code TEXT UNIQUE,
    destination_url TEXT,
    image_base64 TEXT,
    is_dynamic BOOLEAN NOT NULL DEFAULT false,
    scan_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qr_codes_workspace_idx ON qr_codes (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id UUID NOT NULL REFERENCES qr_codes (id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL,
    ip TEXT,
    user_agent TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qr_scans_qr_idx ON qr_scans (qr_id, scanned_at DESC);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qr_codes_tenant ON qr_codes;
CREATE POLICY qr_codes_tenant ON qr_codes
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS qr_codes_public_read ON qr_codes;
CREATE POLICY qr_codes_public_read ON qr_codes
    FOR SELECT USING (short_code IS NOT NULL);

DROP POLICY IF EXISTS qr_scans_tenant ON qr_scans;
CREATE POLICY qr_scans_tenant ON qr_scans
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

DROP POLICY IF EXISTS qr_scans_public_insert ON qr_scans;
CREATE POLICY qr_scans_public_insert ON qr_scans
    FOR INSERT WITH CHECK (true);
