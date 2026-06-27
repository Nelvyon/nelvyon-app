-- O21 — Agent data cache (Semrush/DataForSEO snapshots for OS pack agents)
CREATE TABLE IF NOT EXISTS os_agent_data_cache (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT,
  user_id        UUID,
  provider       TEXT NOT NULL CHECK (provider IN ('semrush','dataforseo','mock')),
  query_type     TEXT NOT NULL CHECK (query_type IN ('domain_overview','keywords','competitors','backlinks')),
  query_key      TEXT NOT NULL,
  domain         TEXT NOT NULL,
  database_code  TEXT NOT NULL DEFAULT 'es',
  payload        JSONB NOT NULL DEFAULT '{}',
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  metadata       JSONB NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS os_agent_data_cache_lookup
  ON os_agent_data_cache (COALESCE(tenant_id,''), provider, query_type, query_key);

CREATE INDEX IF NOT EXISTS os_agent_data_cache_fetched
  ON os_agent_data_cache (fetched_at DESC);
