-- O30 — Truth Guard: unified pre-publish audits for landing / email / ads

CREATE TABLE IF NOT EXISTS os_truth_guard_audits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel           TEXT NOT NULL CHECK (channel IN ('landing','email','ads')),
  pack_run_id       UUID,
  deliverable_ref   TEXT,
  campania_id       UUID,
  tenant_id         UUID,
  workspace_id      INT,
  sector_id         TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','passed','warning','blocked')),
  claims_ok         BOOLEAN NOT NULL DEFAULT true,
  legal_ok          BOOLEAN NOT NULL DEFAULT true,
  channel_ok        BOOLEAN NOT NULL DEFAULT true,
  violations        JSONB NOT NULL DEFAULT '[]',
  checks            JSONB NOT NULL DEFAULT '[]',
  content_preview   TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  audited_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_truth_guard_audits_channel
  ON os_truth_guard_audits (channel, audited_at DESC);

CREATE INDEX IF NOT EXISTS os_truth_guard_audits_pack_run
  ON os_truth_guard_audits (pack_run_id) WHERE pack_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS os_truth_guard_audits_status
  ON os_truth_guard_audits (status, audited_at DESC);
