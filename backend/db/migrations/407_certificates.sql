-- Migration 407: LMS certificates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  logo_position TEXT NOT NULL DEFAULT 'top' CHECK (logo_position IN ('top','bottom')),
  signature_name TEXT NOT NULL,
  signature_title TEXT NOT NULL,
  custom_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  course_id UUID,
  course_name TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  verification_code TEXT NOT NULL UNIQUE,
  issued BOOLEAN NOT NULL DEFAULT FALSE,
  issued_at TIMESTAMPTZ,
  pdf_url TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_tenant ON certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_email ON certificates(recipient_email);
