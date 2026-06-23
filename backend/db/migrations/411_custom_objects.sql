-- Migration 411: Custom objects & records
CREATE TABLE IF NOT EXISTS custom_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plural_name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  fields JSONB NOT NULL DEFAULT '[]',
  records_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS custom_object_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES custom_objects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_objects_tenant ON custom_objects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_object_records_object ON custom_object_records(object_id);
