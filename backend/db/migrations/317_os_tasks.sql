-- OS-1-07: tareas canónicas NELVYON OS (FK → os_projects, os_clients)
-- Preserva tabla pipeline legacy 281 renombrada; no toca nelvyon_* ni SaaS.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'os_tasks'
      AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'os_tasks'
      AND column_name = 'id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE os_tasks RENAME TO os_tasks_legacy_281;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS os_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  INTEGER NOT NULL,
  project_id    UUID REFERENCES os_projects (id) ON DELETE RESTRICT,
  client_id     UUID REFERENCES os_clients (id) ON DELETE RESTRICT,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'archived')),
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee      TEXT,
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_os_tasks_workspace
  ON os_tasks (workspace_id);

CREATE INDEX IF NOT EXISTS idx_os_tasks_project
  ON os_tasks (project_id);

CREATE INDEX IF NOT EXISTS idx_os_tasks_client
  ON os_tasks (client_id);

CREATE INDEX IF NOT EXISTS idx_os_tasks_status
  ON os_tasks (status);

CREATE INDEX IF NOT EXISTS idx_os_tasks_priority
  ON os_tasks (priority);

CREATE INDEX IF NOT EXISTS idx_os_tasks_due_date
  ON os_tasks (due_date);

CREATE INDEX IF NOT EXISTS idx_os_tasks_updated_at
  ON os_tasks (updated_at);

CREATE INDEX IF NOT EXISTS idx_os_tasks_workspace_status
  ON os_tasks (workspace_id, status);

COMMENT ON TABLE os_tasks IS
  'Tareas NELVYON OS (OS-1-07). Fuente oficial PM; os_tasks_legacy_281 conserva pipeline Fase 2C.';

COMMENT ON COLUMN os_tasks.project_id IS
  'Proyecto OS canónico (os_projects.id). Opcional; si se envía, client_id debe ser coherente.';

COMMENT ON COLUMN os_tasks.client_id IS
  'Cliente OS canónico (os_clients.id). Puede inferirse desde project_id.';
