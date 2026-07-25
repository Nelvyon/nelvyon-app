-- 520: ERP domain persistence — Postgres SSOT for Blocks 26–29 (non-financial)
-- Replaces process-memory as runtime SSOT. Migration 519 reserved tables remain;
-- this adds canonical snapshot store + full relational companions + RLS.
-- Scope EXCLUDES: payments, banks, GL, tax, payroll, Odoo, IoT, e-signature blobs.

-- ── Domain snapshots (tenant-scoped durable state; optimistic version) ────────
CREATE TABLE IF NOT EXISTS erp_domain_snapshots (
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('purchases', 'inventory', 'manufacturing', 'projects_fs')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, domain)
);
CREATE INDEX IF NOT EXISTS erp_domain_snapshots_updated_idx
  ON erp_domain_snapshots (updated_at DESC);

-- ── Expand 519 companions (idempotent) ───────────────────────────────────────
ALTER TABLE erp_suppliers
  ADD COLUMN IF NOT EXISTS contacts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS erp_purchase_requests (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  requester_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_limit_cents BIGINT NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_purchase_requests_tenant_idx ON erp_purchase_requests (tenant_id);

CREATE TABLE IF NOT EXISTS erp_rfqs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  purchase_request_id UUID NOT NULL,
  invited_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  quotes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_rfqs_tenant_idx ON erp_rfqs (tenant_id);

CREATE TABLE IF NOT EXISTS erp_goods_receipts (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  purchase_order_id UUID NOT NULL,
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS erp_goods_receipts_tenant_idx ON erp_goods_receipts (tenant_id);

CREATE TABLE IF NOT EXISTS erp_supplier_returns (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  receipt_id UUID NOT NULL,
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_supplier_returns_tenant_idx ON erp_supplier_returns (tenant_id);

CREATE TABLE IF NOT EXISTS erp_incidents (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  linked_type TEXT NOT NULL,
  linked_id UUID NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_incidents_tenant_idx ON erp_incidents (tenant_id);

CREATE TABLE IF NOT EXISTS erp_locations (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  UNIQUE (tenant_id, warehouse_id, code)
);
CREATE INDEX IF NOT EXISTS erp_locations_tenant_idx ON erp_locations (tenant_id);

CREATE TABLE IF NOT EXISTS erp_lots (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  code TEXT NOT NULL,
  expiry_date DATE,
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS erp_serials (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  code TEXT NOT NULL,
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS erp_reservations (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  location_id UUID,
  qty NUMERIC NOT NULL,
  order_ref TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_reservations_tenant_idx ON erp_reservations (tenant_id);

CREATE TABLE IF NOT EXISTS erp_physical_counts (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_min_stock_rules (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id UUID NOT NULL,
  product_sku TEXT NOT NULL,
  min_qty NUMERIC NOT NULL,
  UNIQUE (tenant_id, warehouse_id, product_sku)
);

CREATE TABLE IF NOT EXISTS erp_boms (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  version INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, product_sku, version)
);

CREATE TABLE IF NOT EXISTS erp_work_centers (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS erp_routings (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  version INT NOT NULL,
  operations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (tenant_id, product_sku, version)
);

CREATE TABLE IF NOT EXISTS erp_quality_plans (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  product_sku TEXT,
  steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_inspections (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id UUID,
  mo_id UUID,
  result TEXT NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_non_conformances (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  inspection_id UUID,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_corrective_actions (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  nc_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_assets (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS erp_maintenance_orders (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  asset_id UUID NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  schedule_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_plm_documents (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  version INT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (tenant_id, product_sku, version)
);

CREATE TABLE IF NOT EXISTS erp_timesheets (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  project_id UUID NOT NULL,
  task_id TEXT,
  assignee_id TEXT NOT NULL,
  hours NUMERIC NOT NULL,
  work_date DATE NOT NULL,
  rate_internal_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_timesheets_tenant_idx ON erp_timesheets (tenant_id);

CREATE TABLE IF NOT EXISTS erp_field_work_orders (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  project_id UUID,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  assignee_id TEXT,
  schedule_at TIMESTAMPTZ,
  checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_field_work_orders_tenant_idx ON erp_field_work_orders (tenant_id);

CREATE TABLE IF NOT EXISTS erp_audit_events (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS erp_audit_events_tenant_at_idx ON erp_audit_events (tenant_id, at DESC);

CREATE TABLE IF NOT EXISTS erp_idempotency_keys (
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  idem_key TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, domain, idem_key)
);

-- ── RLS: defense-in-depth (app still filters tenant_id; service_role may bypass) ──
-- Prefer app.tenant_id session GUC when set; else allow if GUC empty (service path must filter).
CREATE OR REPLACE FUNCTION public.nelvyon_erp_tenant_text()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '');
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'erp_domain_snapshots',
    'erp_suppliers',
    'erp_purchase_orders',
    'erp_purchase_requests',
    'erp_rfqs',
    'erp_goods_receipts',
    'erp_supplier_returns',
    'erp_incidents',
    'erp_inventory_products',
    'erp_warehouses',
    'erp_locations',
    'erp_stock_moves',
    'erp_lots',
    'erp_serials',
    'erp_reservations',
    'erp_physical_counts',
    'erp_min_stock_rules',
    'erp_manufacturing_orders',
    'erp_boms',
    'erp_work_centers',
    'erp_routings',
    'erp_quality_plans',
    'erp_inspections',
    'erp_non_conformances',
    'erp_corrective_actions',
    'erp_assets',
    'erp_maintenance_orders',
    'erp_plm_documents',
    'saas_projects_erp',
    'erp_timesheets',
    'erp_field_work_orders',
    'erp_audit_events',
    'erp_idempotency_keys'
  ])
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_erp_tenant ON %I', tbl, tbl);
    -- When app.tenant_id is set, enforce match. When unset (service_role migrate/admin),
    -- policy allows rows only if GUC null — application MUST still filter tenant_id.
    EXECUTE format(
      'CREATE POLICY %I_erp_tenant ON %I FOR ALL
       USING (
         public.nelvyon_erp_tenant_text() IS NULL
         OR tenant_id = public.nelvyon_erp_tenant_text()
       )
       WITH CHECK (
         public.nelvyon_erp_tenant_text() IS NULL
         OR tenant_id = public.nelvyon_erp_tenant_text()
       )',
      tbl, tbl
    );
  END LOOP;
END $$;
