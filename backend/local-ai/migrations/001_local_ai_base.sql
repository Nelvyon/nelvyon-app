-- NELVYON Local AI — base schema (PostgreSQL 16 + pgvector)
-- Standalone: no cloud FKs. tenant_id isolation enforced in application + RLS.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Memory (tenant-scoped persistent context) ───────────────────────────────

CREATE TABLE IF NOT EXISTS local_ai_memory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  client_id    UUID,
  source_id    TEXT NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(768),
  permissions  JSONB NOT NULL DEFAULT '{"read":"tenant","write":"tenant"}'::jsonb,
  checksum     TEXT NOT NULL,
  version      INT NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'archived', 'deleted')),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_ai_memory_tenant
  ON local_ai_memory(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_ai_memory_client
  ON local_ai_memory(tenant_id, client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_local_ai_memory_embedding
  ON local_ai_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE local_ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_ai_memory FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS local_ai_memory_tenant_isolation ON local_ai_memory;
CREATE POLICY local_ai_memory_tenant_isolation ON local_ai_memory
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── RAG documents + chunks ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS local_ai_rag_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  client_id    UUID,
  source_id    TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  uri          TEXT,
  mime_type    TEXT,
  permissions  JSONB NOT NULL DEFAULT '{"read":"tenant"}'::jsonb,
  checksum     TEXT NOT NULL,
  version      INT NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'archived', 'deleted')),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_id, version)
);

CREATE TABLE IF NOT EXISTS local_ai_rag_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  client_id     UUID,
  document_id   UUID NOT NULL REFERENCES local_ai_rag_documents(id) ON DELETE CASCADE,
  source_id     TEXT NOT NULL,
  chunk_index   INT NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(768),
  permissions   JSONB NOT NULL DEFAULT '{"read":"tenant"}'::jsonb,
  checksum      TEXT NOT NULL,
  version       INT NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'archived', 'deleted')),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, document_id, chunk_index, version)
);

CREATE INDEX IF NOT EXISTS idx_local_ai_rag_docs_tenant
  ON local_ai_rag_documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_local_ai_rag_chunks_tenant
  ON local_ai_rag_chunks(tenant_id, document_id);
CREATE INDEX IF NOT EXISTS idx_local_ai_rag_chunks_embedding
  ON local_ai_rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE local_ai_rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_ai_rag_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE local_ai_rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_ai_rag_chunks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS local_ai_rag_docs_tenant ON local_ai_rag_documents;
CREATE POLICY local_ai_rag_docs_tenant ON local_ai_rag_documents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
DROP POLICY IF EXISTS local_ai_rag_chunks_tenant ON local_ai_rag_chunks;
CREATE POLICY local_ai_rag_chunks_tenant ON local_ai_rag_chunks
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── Audit + config + ingest queue ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS local_ai_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  client_id       UUID,
  agent_id        TEXT,
  action          TEXT NOT NULL,
  source_id       TEXT,
  input_checksum  TEXT,
  output_checksum TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_ai_audit_tenant
  ON local_ai_audit(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS local_ai_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  checksum    TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS local_ai_ingest_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  client_id    UUID,
  source_id    TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error        TEXT,
  checksum     TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_local_ai_ingest_tenant
  ON local_ai_ingest_jobs(tenant_id, status, created_at DESC);

INSERT INTO local_ai_config (key, value, checksum)
VALUES (
  'schema_version',
  '{"version": 1, "embedding_dim": 768}'::jsonb,
  encode(digest('schema_v1', 'sha256'), 'hex')
)
ON CONFLICT (key) DO NOTHING;
