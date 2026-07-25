-- 519: ERP non-financial cores — reserved durable schema (Blocks 26–29)
-- Honesty: schema reserved for future persistence; runtime SSOT is agency cores
-- (PurchasesSuppliersCore / InventoryWarehousesCore / ManufacturingOpsCore /
-- ProjectsFieldServiceCore) in-memory until dual-write is explicitly implemented.
-- No payments, bank, tax, GL, IoT, or e-signature columns — those stay BLOCKED_*.

-- Suppliers (PurchasesSuppliersCore)
CREATE TABLE IF NOT EXISTS erp_suppliers (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_terms_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_suppliers_tenant_idx ON erp_suppliers (tenant_id);
-- RLS: enable + tenant_id = current_setting('app.tenant_id') when dual-write lands.

-- Purchase orders (informational unit prices only — NEVER payment instructions)
CREATE TABLE IF NOT EXISTS erp_purchase_orders (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  supplier_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_purchase_orders_tenant_idx ON erp_purchase_orders (tenant_id);

-- Inventory products
CREATE TABLE IF NOT EXISTS erp_inventory_products (
  tenant_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'u',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, sku)
);

-- Warehouses
CREATE TABLE IF NOT EXISTS erp_warehouses (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS erp_warehouses_tenant_idx ON erp_warehouses (tenant_id);

-- Immutable stock moves (append-only intent; app enforces freeze until dual-write)
CREATE TABLE IF NOT EXISTS erp_stock_moves (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  move_type TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  from_loc_id UUID,
  to_loc_id UUID,
  qty NUMERIC NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  actor_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS erp_stock_moves_tenant_idx ON erp_stock_moves (tenant_id);

-- Manufacturing orders
CREATE TABLE IF NOT EXISTS erp_manufacturing_orders (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  bom_id UUID,
  qty NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  qty_good NUMERIC NOT NULL DEFAULT 0,
  qty_scrap NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS erp_manufacturing_orders_tenant_idx ON erp_manufacturing_orders (tenant_id);

-- Projects (ops — not accounting)
CREATE TABLE IF NOT EXISTS saas_projects_erp (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  template_id TEXT,
  milestones_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  tasks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS saas_projects_erp_tenant_idx ON saas_projects_erp (tenant_id);

-- Comment-only RLS contract (no policies enabled yet — avoid locking empty reserved tables):
-- ALTER TABLE erp_suppliers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY erp_suppliers_tenant ON erp_suppliers
--   USING (tenant_id = current_setting('app.tenant_id', true));
-- (same pattern for each table above when dual-write ships)
