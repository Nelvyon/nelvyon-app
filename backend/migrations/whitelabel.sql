-- NELVYON white-label branding per workspace

CREATE TABLE IF NOT EXISTS whitelabel_configs (
    workspace_id INTEGER PRIMARY KEY,
    custom_domain TEXT,
    brand_name TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    colors JSONB NOT NULL DEFAULT '{}'::jsonb,
    email_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    hide_branding BOOLEAN NOT NULL DEFAULT FALSE,
    custom_css TEXT,
    verified_domain BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS whitelabel_configs_domain_idx
    ON whitelabel_configs (custom_domain)
    WHERE custom_domain IS NOT NULL;
