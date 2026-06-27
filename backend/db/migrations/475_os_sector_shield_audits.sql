-- O27 — Regulated sector shield audits (EU disclaimer + claims scan + portal block)
CREATE TABLE IF NOT EXISTS os_sector_shield_audits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_run_id       UUID,
  deliverable_ref   TEXT,
  tenant_id         UUID,
  workspace_id      INT,
  sector_id         TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','passed','blocked','warning')),
  regulated         BOOLEAN NOT NULL DEFAULT false,
  disclaimer_ok     BOOLEAN NOT NULL DEFAULT false,
  claims_ok         BOOLEAN NOT NULL DEFAULT false,
  disclaimer_text   TEXT,
  claims_violations JSONB NOT NULL DEFAULT '[]',
  checks            JSONB NOT NULL DEFAULT '[]',
  metadata          JSONB NOT NULL DEFAULT '{}',
  audited_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_sector_shield_audits_sector
  ON os_sector_shield_audits (sector_id, audited_at DESC);

CREATE INDEX IF NOT EXISTS os_sector_shield_audits_pack_run
  ON os_sector_shield_audits (pack_run_id) WHERE pack_run_id IS NOT NULL;
