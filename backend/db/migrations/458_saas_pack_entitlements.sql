-- S52 — Pack Store entitlements (per-tenant pack access + launch quota)
CREATE TABLE IF NOT EXISTS saas_pack_entitlements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL,
  pack_id                   TEXT NOT NULL,
  source                    TEXT NOT NULL DEFAULT 'plan'
                            CHECK (source IN ('plan','purchase','promo','admin')),
  status                    TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','expired','revoked')),
  launches_remaining        INT,          -- NULL = ilimitado
  launches_used             INT NOT NULL DEFAULT 0,
  stripe_payment_intent_id  TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}',
  granted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at                TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS saas_pack_entitlements_tenant_pack_active
  ON saas_pack_entitlements (tenant_id, pack_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS saas_pack_entitlements_tenant
  ON saas_pack_entitlements (tenant_id, status);
