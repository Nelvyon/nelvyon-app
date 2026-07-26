/**
 * ADR-062 relational dual-write mirror — staging-first.
 * SSOT remains erp_domain_snapshots JSONB. When DUAL_WRITE=1, companion rows
 * are upserted in the SAME transaction after snapshot save (fail-closed).
 * READ flip is separate (NELVYON_ERP_RELATIONAL_READ) and not used by APIs yet.
 */

import type pg from "pg";
import type { ErpDomain } from "./ErpDomainSnapshotStore";
import { isErpRelationalDualWriteEnabled } from "./erpRelationalFlags";

type Rec = Record<string, unknown>;

function asRecMap(raw: unknown): Rec {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Rec;
  return {};
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Mirror snapshot payload into reserved companion tables (same TX / tenant GUC). */
export async function mirrorErpDomainToRelational(
  client: pg.PoolClient,
  tenantId: string,
  domain: ErpDomain,
  payload: object,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ mirrored: boolean; entities: number }> {
  if (!isErpRelationalDualWriteEnabled(env)) {
    return { mirrored: false, entities: 0 };
  }

  const p = (payload ?? {}) as Rec;
  let entities = 0;

  if (domain === "purchases") {
    entities += await mirrorSuppliers(client, tenantId, asRecMap(p.suppliers));
    entities += await mirrorPurchaseOrders(client, tenantId, asRecMap(p.purchaseOrders));
  } else if (domain === "inventory") {
    entities += await mirrorProducts(client, tenantId, asRecMap(p.products));
    entities += await mirrorWarehouses(client, tenantId, asRecMap(p.warehouses));
  } else if (domain === "manufacturing") {
    entities += await mirrorManufacturingOrders(client, tenantId, asRecMap(p.manufacturingOrders ?? p.mos));
  } else if (domain === "projects_fs") {
    entities += await mirrorProjects(client, tenantId, asRecMap(p.projects));
  }

  return { mirrored: true, entities };
}

async function mirrorSuppliers(client: pg.PoolClient, tenantId: string, suppliers: Rec): Promise<number> {
  let n = 0;
  for (const [id, raw] of Object.entries(suppliers)) {
    const s = asRecMap(raw);
    await client.query(
      `INSERT INTO erp_suppliers (id, tenant_id, name, category, payment_terms_note, status, created_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         payment_terms_note = EXCLUDED.payment_terms_note,
         status = EXCLUDED.status
       WHERE erp_suppliers.tenant_id = $2`,
      [
        id,
        tenantId,
        str(s.name, "unnamed"),
        str(s.category, "general"),
        str(s.paymentTermsNote ?? s.payment_terms_note),
        str(s.status, "active"),
        str(s.createdAt) || null,
      ],
    );
    n += 1;
  }
  return n;
}

async function mirrorPurchaseOrders(client: pg.PoolClient, tenantId: string, pos: Rec): Promise<number> {
  let n = 0;
  for (const [id, raw] of Object.entries(pos)) {
    const po = asRecMap(raw);
    const supplierId = str(po.supplierId ?? po.supplier_id) || null;
    await client.query(
      `INSERT INTO erp_purchase_orders (id, tenant_id, supplier_id, status, lines_json, created_at)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5::jsonb, COALESCE($6, NOW()))
       ON CONFLICT (id) DO UPDATE SET
         supplier_id = EXCLUDED.supplier_id,
         status = EXCLUDED.status,
         lines_json = EXCLUDED.lines_json
       WHERE erp_purchase_orders.tenant_id = $2`,
      [
        id,
        tenantId,
        supplierId,
        str(po.status, "draft"),
        JSON.stringify(po.lines ?? po.lines_json ?? []),
        str(po.createdAt) || null,
      ],
    );
    n += 1;
  }
  return n;
}

async function mirrorProducts(client: pg.PoolClient, tenantId: string, products: Rec): Promise<number> {
  let n = 0;
  for (const [, raw] of Object.entries(products)) {
    const p = asRecMap(raw);
    const sku = str(p.sku);
    if (!sku) continue;
    await client.query(
      `INSERT INTO erp_inventory_products (tenant_id, sku, name, uom, created_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
       ON CONFLICT (tenant_id, sku) DO UPDATE SET
         name = EXCLUDED.name,
         uom = EXCLUDED.uom`,
      [tenantId, sku, str(p.name, sku), str(p.uom, "u"), str(p.createdAt) || null],
    );
    n += 1;
  }
  return n;
}

async function mirrorWarehouses(client: pg.PoolClient, tenantId: string, warehouses: Rec): Promise<number> {
  let n = 0;
  for (const [id, raw] of Object.entries(warehouses)) {
    const w = asRecMap(raw);
    await client.query(
      `INSERT INTO erp_warehouses (id, tenant_id, code, name, created_at)
       VALUES ($1::uuid, $2, $3, $4, COALESCE($5, NOW()))
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         name = EXCLUDED.name
       WHERE erp_warehouses.tenant_id = $2`,
      [id, tenantId, str(w.code, id.slice(0, 8)), str(w.name, "warehouse"), str(w.createdAt) || null],
    );
    n += 1;
  }
  return n;
}

async function mirrorManufacturingOrders(client: pg.PoolClient, tenantId: string, mos: Rec): Promise<number> {
  let n = 0;
  for (const [id, raw] of Object.entries(mos)) {
    const m = asRecMap(raw);
    const bomId = str(m.bomId ?? m.bom_id) || null;
    await client.query(
      `INSERT INTO erp_manufacturing_orders
         (id, tenant_id, product_sku, bom_id, qty, status, qty_good, qty_scrap, created_at)
       VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7, $8, COALESCE($9, NOW()))
       ON CONFLICT (id) DO UPDATE SET
         product_sku = EXCLUDED.product_sku,
         bom_id = EXCLUDED.bom_id,
         qty = EXCLUDED.qty,
         status = EXCLUDED.status,
         qty_good = EXCLUDED.qty_good,
         qty_scrap = EXCLUDED.qty_scrap
       WHERE erp_manufacturing_orders.tenant_id = $2`,
      [
        id,
        tenantId,
        str(m.productSku ?? m.product_sku, "SKU"),
        bomId,
        num(m.qty, 0),
        str(m.status, "draft"),
        num(m.qtyGood ?? m.qty_good, 0),
        num(m.qtyScrap ?? m.qty_scrap, 0),
        str(m.createdAt) || null,
      ],
    );
    n += 1;
  }
  return n;
}

async function mirrorProjects(client: pg.PoolClient, tenantId: string, projects: Rec): Promise<number> {
  let n = 0;
  for (const [id, raw] of Object.entries(projects)) {
    const p = asRecMap(raw);
    await client.query(
      `INSERT INTO saas_projects_erp
         (id, tenant_id, name, status, template_id, milestones_json, tasks_json, created_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb, COALESCE($8, NOW()))
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         status = EXCLUDED.status,
         template_id = EXCLUDED.template_id,
         milestones_json = EXCLUDED.milestones_json,
         tasks_json = EXCLUDED.tasks_json
       WHERE saas_projects_erp.tenant_id = $2`,
      [
        id,
        tenantId,
        str(p.name, "project"),
        str(p.status, "draft"),
        str(p.templateId ?? p.template_id) || null,
        JSON.stringify(p.milestones ?? []),
        JSON.stringify(p.tasks ?? []),
        str(p.createdAt) || null,
      ],
    );
    n += 1;
  }
  return n;
}

/** Count companion rows for equivalence checks (tenant-scoped). */
export async function countRelationalEntities(
  client: pg.PoolClient,
  tenantId: string,
  domain: ErpDomain,
): Promise<number> {
  if (domain === "purchases") {
    const r = await client.query<{ c: string }>(
      `SELECT (
         (SELECT COUNT(*)::text FROM erp_suppliers WHERE tenant_id = $1)::int +
         (SELECT COUNT(*)::text FROM erp_purchase_orders WHERE tenant_id = $1)::int
       )::text AS c`,
      [tenantId],
    );
    return Number(r.rows[0]?.c ?? 0);
  }
  if (domain === "inventory") {
    const r = await client.query<{ c: string }>(
      `SELECT (
         (SELECT COUNT(*)::text FROM erp_inventory_products WHERE tenant_id = $1)::int +
         (SELECT COUNT(*)::text FROM erp_warehouses WHERE tenant_id = $1)::int
       )::text AS c`,
      [tenantId],
    );
    return Number(r.rows[0]?.c ?? 0);
  }
  if (domain === "manufacturing") {
    const r = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM erp_manufacturing_orders WHERE tenant_id = $1`,
      [tenantId],
    );
    return Number(r.rows[0]?.c ?? 0);
  }
  const r = await client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM saas_projects_erp WHERE tenant_id = $1`,
    [tenantId],
  );
  return Number(r.rows[0]?.c ?? 0);
}
