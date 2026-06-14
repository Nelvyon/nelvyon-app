-- Pack orchestration runs (Local Business Growth Pack and future packs)
CREATE TABLE IF NOT EXISTS nelvyon_pack_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL DEFAULT 'local-business-growth',
  status TEXT NOT NULL DEFAULT 'running',
  intake JSONB NOT NULL DEFAULT '{}'::jsonb,
  saas_client_id INTEGER,
  saas_campaign_id INTEGER,
  os_client_id TEXT,
  os_project_id TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  report JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pack_runs_workspace ON nelvyon_pack_runs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pack_runs_os_client ON nelvyon_pack_runs (os_client_id);
