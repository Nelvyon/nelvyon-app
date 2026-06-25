-- S33: Enterprise SSO + Audit indices

-- ── SSO Configs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_sso_configs (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               TEXT        NOT NULL UNIQUE REFERENCES saas_tenants(id) ON DELETE CASCADE,
  provider                TEXT        NOT NULL CHECK (provider IN ('oidc','saml')),
  issuer                  TEXT        NOT NULL,
  client_id               TEXT        NOT NULL,
  client_secret_enc       TEXT        NOT NULL,      -- AES-256-GCM encrypted
  metadata_url            TEXT,
  domains                 TEXT[]      NOT NULL DEFAULT '{}',
  enforced                BOOLEAN     NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_sso_configs_tenant ON saas_sso_configs(tenant_id);

-- ── SSO Identities (provider_sub → local user mapping) ───────────────────────
CREATE TABLE IF NOT EXISTS saas_sso_identities (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT        NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  provider     TEXT        NOT NULL,
  provider_sub TEXT        NOT NULL,
  user_id      TEXT        NOT NULL,
  email        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider, provider_sub)
);

CREATE INDEX IF NOT EXISTS idx_saas_sso_identities_user   ON saas_sso_identities(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_saas_sso_identities_sub    ON saas_sso_identities(provider, provider_sub);

-- ── Extra audit_logs indices (action-level queries) ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action ON audit_logs(tenant_id, module, action, created_at DESC);
