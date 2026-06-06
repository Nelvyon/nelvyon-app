-- OS-1-11: historial de versiones de entregables (revisiones tras feedback cliente)

CREATE TABLE IF NOT EXISTS os_deliverable_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    INTEGER NOT NULL,
  deliverable_id  UUID NOT NULL REFERENCES os_deliverables (id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  status          TEXT NOT NULL,
  file_url        TEXT,
  review_notes    TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deliverable_id, version)
);

CREATE INDEX IF NOT EXISTS idx_os_deliverable_versions_deliverable
  ON os_deliverable_versions (deliverable_id);

CREATE INDEX IF NOT EXISTS idx_os_deliverable_versions_workspace
  ON os_deliverable_versions (workspace_id);

COMMENT ON TABLE os_deliverable_versions IS
  'Snapshots de versiones anteriores al crear revisión (OS-1-11).';
