-- OS-1-10: revisiones cliente portal sobre entregables publicados

ALTER TABLE os_deliverables
  ADD COLUMN IF NOT EXISTS client_reviewed_at TIMESTAMPTZ;

ALTER TABLE os_deliverables
  ADD COLUMN IF NOT EXISTS approved_by_portal_user_id UUID REFERENCES os_portal_users (id) ON DELETE SET NULL;

ALTER TABLE os_deliverables DROP CONSTRAINT IF EXISTS os_deliverables_status_check;

ALTER TABLE os_deliverables ADD CONSTRAINT os_deliverables_status_check
  CHECK (status IN (
    'draft', 'in_review', 'delivered', 'approved', 'published',
    'approved_by_client', 'changes_requested',
    'rejected', 'archived'
  ));

CREATE TABLE IF NOT EXISTS os_deliverable_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    INTEGER NOT NULL,
  deliverable_id  UUID NOT NULL REFERENCES os_deliverables (id) ON DELETE CASCADE,
  portal_user_id  UUID NOT NULL REFERENCES os_portal_users (id) ON DELETE RESTRICT,
  decision        TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
  feedback        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_deliverable_reviews_deliverable
  ON os_deliverable_reviews (deliverable_id);

CREATE INDEX IF NOT EXISTS idx_os_deliverable_reviews_workspace
  ON os_deliverable_reviews (workspace_id);

CREATE INDEX IF NOT EXISTS idx_os_deliverable_reviews_portal_user
  ON os_deliverable_reviews (portal_user_id);

COMMENT ON TABLE os_deliverable_reviews IS
  'Historial de aprobación/rechazo cliente portal (OS-1-10).';

COMMENT ON COLUMN os_deliverables.approved_by_portal_user_id IS
  'Último portal user que aprobó el entregable (si status=approved_by_client).';
