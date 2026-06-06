-- OS-1-04: proyectos canónicos NELVYON OS (FK → os_clients; nelvyon_projects permanece legacy)

CREATE TABLE IF NOT EXISTS os_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  INTEGER NOT NULL,
  client_id     UUID NOT NULL REFERENCES os_clients (id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled', 'archived')),
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date    DATE,
  due_date      DATE,
  budget        NUMERIC(14, 2),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_os_projects_workspace
  ON os_projects (workspace_id);

CREATE INDEX IF NOT EXISTS idx_os_projects_client
  ON os_projects (client_id);

CREATE INDEX IF NOT EXISTS idx_os_projects_status
  ON os_projects (status);

CREATE INDEX IF NOT EXISTS idx_os_projects_due_date
  ON os_projects (due_date);

CREATE INDEX IF NOT EXISTS idx_os_projects_updated_at
  ON os_projects (updated_at);

CREATE INDEX IF NOT EXISTS idx_os_projects_workspace_status
  ON os_projects (workspace_id, status);

COMMENT ON TABLE os_projects IS
  'Proyectos NELVYON OS (OS-1). Fuente oficial PM; nelvyon_projects permanece legacy hasta backfill posterior.';

COMMENT ON COLUMN os_projects.client_id IS
  'Cliente OS canónico (os_clients.id). ON DELETE RESTRICT — no borrar clientes con proyectos activos.';

COMMENT ON COLUMN os_projects.workspace_id IS
  'Denormalizado para aislamiento por workspace; debe coincidir con os_clients.workspace_id del client_id.';

COMMENT ON COLUMN os_projects.archived_at IS
  'Timestamp de archivado lógico; status=archived cuando se archiva explícitamente.';
