-- S50: saas_compliance_vault — legal/consent/QA artifacts per deliverable (SaaS tenant-scoped)
-- NOTE: compliance_results (migration 109) is legacy OS user-scoped; NOT reused here.
CREATE TABLE IF NOT EXISTS saas_compliance_vault (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL,
  deliverable_source TEXT        NOT NULL
                                 CHECK (deliverable_source IN ('os','recurring','pack_run')),
  deliverable_ref    TEXT        NOT NULL,
  pack_run_id        UUID        REFERENCES nelvyon_pack_runs(id) ON DELETE SET NULL,
  pack_id            TEXT,
  title              TEXT,
  consent_type       TEXT        NOT NULL DEFAULT 'client_approval'
                                 CHECK (consent_type IN (
                                   'gdpr_marketing','gdpr_data_processing',
                                   'sector_disclaimer','client_approval','qa_certificate','other'
                                 )),
  legal_doc_url      TEXT,
  qa_pdf_url         TEXT,
  content_hash       TEXT,
  status             TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','verified','expired','revoked')),
  metadata           JSONB       NOT NULL DEFAULT '{}',
  verified_by        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at        TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS saas_compliance_vault_tenant_deliverable
  ON saas_compliance_vault (tenant_id, deliverable_source, deliverable_ref, consent_type);

CREATE INDEX IF NOT EXISTS saas_compliance_vault_tenant_status
  ON saas_compliance_vault (tenant_id, status, created_at DESC);
