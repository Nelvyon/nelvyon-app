-- Batch certification registry for OS sector agents (~194 sector service ids)
CREATE TABLE IF NOT EXISTS os_sector_certifications (
  sector_service_id   TEXT PRIMARY KEY,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','passed','failed')),
  agent_instantiates  BOOLEAN NOT NULL DEFAULT false,
  intake_schema_valid BOOLEAN NOT NULL DEFAULT false,
  failure_reason      TEXT,
  certified_at        TIMESTAMPTZ,
  last_checked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata            JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_os_sector_cert_status ON os_sector_certifications (status);
