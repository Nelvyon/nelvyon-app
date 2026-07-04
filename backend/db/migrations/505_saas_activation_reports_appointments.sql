-- Migration 505: SaaS activation checklist, reports, appointments (remove runtime DDL from routes)
CREATE TABLE IF NOT EXISTS saas_activation_checklist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL UNIQUE,
  step_profile BOOLEAN NOT NULL DEFAULT FALSE,
  step_contact BOOLEAN NOT NULL DEFAULT FALSE,
  step_campaign BOOLEAN NOT NULL DEFAULT FALSE,
  step_workflow BOOLEAN NOT NULL DEFAULT FALSE,
  step_social   BOOLEAN NOT NULL DEFAULT FALSE,
  step_billing  BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_activation_checklist_tenant ON saas_activation_checklist(tenant_id);

CREATE TABLE IF NOT EXISTS saas_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'ready',
  download_url TEXT,
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_reports_tenant ON saas_reports(tenant_id);

CREATE TABLE IF NOT EXISTS saas_appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  title             TEXT NOT NULL,
  contact_name      TEXT NOT NULL,
  contact_email     TEXT NOT NULL,
  contact_phone     TEXT,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'scheduled',
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER NOT NULL DEFAULT 30,
  assigned_to       TEXT,
  meeting_url       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_appointments_tenant ON saas_appointments(tenant_id);
