-- Frente 57 — White-label extended config + partner sub-workspaces

ALTER TABLE whitelabel_configs ADD COLUMN IF NOT EXISTS font TEXT NOT NULL DEFAULT 'Inter';
ALTER TABLE whitelabel_configs ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE whitelabel_configs ADD COLUMN IF NOT EXISTS dns_txt_token TEXT;
ALTER TABLE whitelabel_configs ADD COLUMN IF NOT EXISTS ses_domain_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS parent_workspace_id INTEGER;

CREATE INDEX IF NOT EXISTS workspaces_parent_ws_idx ON workspaces (parent_workspace_id);

CREATE TABLE IF NOT EXISTS whitelabel_partner_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_workspace_id INTEGER NOT NULL,
    client_workspace_id INTEGER NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    admin_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whitelabel_partner_clients_partner_idx
    ON whitelabel_partner_clients (partner_workspace_id);
