-- 495 — One-click portal approve/reject tokens (no login required)
CREATE TABLE IF NOT EXISTS os_deliverable_approval_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash      TEXT NOT NULL UNIQUE,
  deliverable_id  UUID NOT NULL,
  workspace_id    INTEGER NOT NULL,
  client_id       UUID NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_approval_tokens_deliverable
  ON os_deliverable_approval_tokens(deliverable_id);

CREATE INDEX IF NOT EXISTS idx_portal_approval_tokens_expires
  ON os_deliverable_approval_tokens(expires_at) WHERE used_at IS NULL;
