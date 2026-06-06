-- OS-1-08: entregables canónicos NELVYON OS (FK → os_clients, os_projects, os_tasks)
-- No toca nelvyon_outputs ni SaaS.

CREATE TABLE IF NOT EXISTS os_deliverables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  INTEGER NOT NULL,
  client_id     UUID NOT NULL REFERENCES os_clients (id) ON DELETE RESTRICT,
  project_id    UUID NOT NULL REFERENCES os_projects (id) ON DELETE RESTRICT,
  task_id       UUID REFERENCES os_tasks (id) ON DELETE RESTRICT,
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN (
                  'draft', 'in_review', 'delivered', 'approved', 'published', 'rejected', 'archived'
                )),
  visibility    TEXT NOT NULL DEFAULT 'internal'
                CHECK (visibility IN ('internal', 'client_visible')),
  file_url      TEXT,
  storage_key   TEXT,
  version       INTEGER NOT NULL DEFAULT 1,
  review_notes  TEXT,
  delivered_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  published_at  TIMESTAMPTZ,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_os_deliverables_workspace
  ON os_deliverables (workspace_id);

CREATE INDEX IF NOT EXISTS idx_os_deliverables_client
  ON os_deliverables (client_id);

CREATE INDEX IF NOT EXISTS idx_os_deliverables_project
  ON os_deliverables (project_id);

CREATE INDEX IF NOT EXISTS idx_os_deliverables_task
  ON os_deliverables (task_id);

CREATE INDEX IF NOT EXISTS idx_os_deliverables_status
  ON os_deliverables (status);

CREATE INDEX IF NOT EXISTS idx_os_deliverables_visibility
  ON os_deliverables (visibility);

CREATE INDEX IF NOT EXISTS idx_os_deliverables_updated_at
  ON os_deliverables (updated_at);

CREATE INDEX IF NOT EXISTS idx_os_deliverables_workspace_status
  ON os_deliverables (workspace_id, status);

COMMENT ON TABLE os_deliverables IS
  'Entregables NELVYON OS (OS-1-08). Workflow: draft → in_review → delivered → approved → published.';

COMMENT ON COLUMN os_deliverables.task_id IS
  'Tarea OS opcional; si se envía, debe pertenecer al project_id indicado.';

COMMENT ON COLUMN os_deliverables.visibility IS
  'internal hasta publicación; publish fuerza client_visible.';
