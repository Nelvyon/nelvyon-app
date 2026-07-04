-- 503 — Fase 2: IA privada, registry de agentes, auditoría y cola de aprobación

CREATE TABLE IF NOT EXISTS saas_private_ai_settings (
  tenant_id         UUID PRIMARY KEY REFERENCES saas_tenants(id) ON DELETE CASCADE,
  ai_mode           TEXT NOT NULL DEFAULT 'unconfigured'
                    CHECK (ai_mode IN ('auto', 'local', 'openai', 'anthropic', 'mock')),
  private_ai_only   BOOLEAN NOT NULL DEFAULT FALSE,
  ollama_base_url   TEXT,
  ollama_model      TEXT,
  openai_model      TEXT,
  anthropic_model   TEXT,
  default_agent_id  TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_private_ai_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  user_id         UUID,
  agent_id        TEXT NOT NULL,
  action          TEXT NOT NULL,
  provider        TEXT NOT NULL,
  model           TEXT,
  prompt_hash     TEXT,
  input_preview   TEXT,
  output_preview  TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_ai_audit_tenant_created
  ON saas_private_ai_audit(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_private_ai_audit_agent
  ON saas_private_ai_audit(tenant_id, agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saas_private_ai_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  agent_id        TEXT NOT NULL,
  action_type     TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requested_by    UUID,
  reviewed_by     UUID,
  review_note     TEXT,
  reviewed_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_ai_approvals_tenant_status
  ON saas_private_ai_approvals(tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS nelvyon_rag_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source      TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nelvyon_rag_source
  ON nelvyon_rag_chunks(source);

CREATE INDEX IF NOT EXISTS idx_nelvyon_rag_tags
  ON nelvyon_rag_chunks USING GIN (tags);
