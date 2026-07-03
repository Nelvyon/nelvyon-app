-- 496 — Tenant autonomy mode (draft / propose / execute)
ALTER TABLE saas_tenants
  ADD COLUMN IF NOT EXISTS autonomy_mode TEXT NOT NULL DEFAULT 'propose'
    CHECK (autonomy_mode IN ('draft', 'propose', 'execute'));
