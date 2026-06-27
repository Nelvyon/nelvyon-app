-- O23 — Delivery certificate per pack run (QA + legal + agents + seed + hash)
CREATE TABLE IF NOT EXISTS os_delivery_certificates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_run_id       UUID NOT NULL,
  pack_id           TEXT NOT NULL,
  tenant_id         UUID,
  workspace_id      INT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','issued','failed')),
  qa_score          NUMERIC,
  legal_passed      BOOLEAN,
  visual_score      NUMERIC,
  lighthouse_score  NUMERIC,
  seed_id           TEXT,
  seed_source       TEXT,
  agent_provider    TEXT CHECK (agent_provider IN ('semrush','dataforseo','mock','none')),
  agents_used       JSONB NOT NULL DEFAULT '[]',
  content_hash      TEXT,
  html_body         TEXT,
  cert_url          TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  issued_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS os_delivery_certificates_pack_run
  ON os_delivery_certificates (pack_run_id);

CREATE INDEX IF NOT EXISTS os_delivery_certificates_issued
  ON os_delivery_certificates (issued_at DESC NULLS LAST);
