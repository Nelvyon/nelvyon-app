-- S53 — Data Playbooks (auto-generated growth playbooks from tenant metrics)
CREATE TABLE IF NOT EXISTS saas_data_playbooks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  slug              TEXT NOT NULL,
  title             TEXT NOT NULL,
  trigger_reason    TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'growth'
                    CHECK (category IN ('growth','retention','ads','email','seo','compliance')),
  priority          INT NOT NULL DEFAULT 50,
  status            TEXT NOT NULL DEFAULT 'suggested'
                    CHECK (status IN ('suggested','active','dismissed','completed')),
  context_snapshot  JSONB NOT NULL DEFAULT '{}',
  rendered_summary  TEXT,
  pack_id           TEXT,
  cta_href          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS saas_data_playbooks_tenant_slug
  ON saas_data_playbooks (tenant_id, slug);
CREATE INDEX IF NOT EXISTS saas_data_playbooks_tenant_status
  ON saas_data_playbooks (tenant_id, status, priority DESC);

CREATE TABLE IF NOT EXISTS saas_data_playbook_steps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id  UUID NOT NULL REFERENCES saas_data_playbooks(id) ON DELETE CASCADE,
  tenant_id    TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  step_type    TEXT NOT NULL
               CHECK (step_type IN ('insight','action','email_draft','launch_pack','enable_autopilot','review_metric')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}',
  completed    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saas_data_playbook_steps_playbook
  ON saas_data_playbook_steps (playbook_id, sort_order);
