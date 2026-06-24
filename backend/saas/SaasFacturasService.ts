import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export type FacturaStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface FacturaLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Factura {
  id: string;
  tenantId: string;
  contactId: string | null;
  invoiceNumber: string;
  status: FacturaStatus;
  lineItems: FacturaLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateFacturaInput {
  contactId?: string;
  lineItems: FacturaLineItem[];
  taxRate?: number;
  currency?: string;
  notes?: string;
  dueDate?: string;
}

export interface UpdateFacturaInput {
  status?: FacturaStatus;
  lineItems?: FacturaLineItem[];
  taxRate?: number;
  notes?: string;
  dueDate?: string;
  paidAt?: string;
}

export interface FacturaStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalRevenue: number;
  pendingRevenue: number;
}

export type SaasFacturasServiceDeps = {
  db?: Pick<DbClient, "query">;
};

function mapRow(row: Record<string, unknown>): Factura {
  return {
    id: String(row.id),
    tenantId: String(row.tenantId ?? row.tenant_id),
    contactId: row.contactId != null ? String(row.contactId) : (row.contact_id != null ? String(row.contact_id) : null),
    invoiceNumber: String(row.invoiceNumber ?? row.invoice_number),
    status: String(row.status) as FacturaStatus,
    lineItems: Array.isArray(row.lineItems) ? row.lineItems as FacturaLineItem[] : (Array.isArray(row.line_items) ? row.line_items as FacturaLineItem[] : []),
    subtotal: Number(row.subtotal ?? 0),
    taxRate: Number(row.taxRate ?? row.tax_rate ?? 21),
    taxAmount: Number(row.taxAmount ?? row.tax_amount ?? 0),
    total: Number(row.total ?? 0),
    currency: String(row.currency ?? "EUR"),
    notes: row.notes != null ? String(row.notes) : null,
    dueDate: row.dueDate != null ? String(row.dueDate) : (row.due_date != null ? String(row.due_date) : null),
    paidAt: row.paidAt != null ? String(row.paidAt) : (row.paid_at != null ? String(row.paid_at) : null),
    createdAt: String(row.createdAt ?? row.created_at),
  };
}

function calcTotals(lineItems: FacturaLineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}

export class SaasFacturasService {
  constructor(private readonly deps: SaasFacturasServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async list(tenantId: string, status?: FacturaStatus): Promise<Factura[]> {
    const baseQ = `
      SELECT id, tenant_id as "tenantId", contact_id as "contactId",
             invoice_number as "invoiceNumber", status,
             line_items as "lineItems", subtotal, tax_rate as "taxRate",
             tax_amount as "taxAmount", total, currency, notes,
             due_date as "dueDate", paid_at as "paidAt", created_at as "createdAt"
      FROM invoices WHERE tenant_id = $1`;
    const rows = status
      ? await this.db.query<Record<string, unknown>>(baseQ + ` AND status = $2 ORDER BY created_at DESC`, [tenantId, status])
      : await this.db.query<Record<string, unknown>>(baseQ + ` ORDER BY created_at DESC`, [tenantId]);
    return rows.map(mapRow);
  }

  async get(tenantId: string, id: string): Promise<Factura | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, tenant_id as "tenantId", contact_id as "contactId",
              invoice_number as "invoiceNumber", status,
              line_items as "lineItems", subtotal, tax_rate as "taxRate",
              tax_amount as "taxAmount", total, currency, notes,
              due_date as "dueDate", paid_at as "paidAt", created_at as "createdAt"
       FROM invoices WHERE id = $1::uuid AND tenant_id = $2`,
      [id, tenantId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(tenantId: string, input: CreateFacturaInput): Promise<Factura> {
    if (!input.lineItems?.length) throw Object.assign(new Error("At least one line item required"), { code: "VALIDATION" });
    const taxRate = input.taxRate ?? 21;
    const { subtotal, taxAmount, total } = calcTotals(input.lineItems, taxRate);

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM invoices WHERE tenant_id = $1`, [tenantId],
    );
    const count = parseInt(countRows[0]?.count ?? "0", 10) + 1;
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(count).padStart(5, "0")}`;

    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO invoices
         (tenant_id, contact_id, invoice_number, status, line_items, subtotal, tax_rate, tax_amount, total, currency, notes, due_date)
       VALUES ($1, $2, $3, 'draft', $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, tenant_id as "tenantId", contact_id as "contactId",
                 invoice_number as "invoiceNumber", status,
                 line_items as "lineItems", subtotal, tax_rate as "taxRate",
                 tax_amount as "taxAmount", total, currency, notes,
                 due_date as "dueDate", paid_at as "paidAt", created_at as "createdAt"`,
      [
        tenantId, input.contactId ?? null, invoiceNumber,
        JSON.stringify(input.lineItems), subtotal, taxRate, taxAmount, total,
        input.currency ?? "EUR", input.notes ?? null, input.dueDate ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasFacturasService.create: INSERT returned no row");
    logger.info(`[FACTURAS] Factura ${invoiceNumber} creada para tenant=${tenantId}`);
    return mapRow(row);
  }

  async update(tenantId: string, id: string, patch: UpdateFacturaInput): Promise<Factura | null> {
    const existing = await this.get(tenantId, id);
    if (!existing) return null;

    const lineItems = patch.lineItems ?? existing.lineItems;
    const taxRate = patch.taxRate ?? existing.taxRate;
    const { subtotal, taxAmount, total } = calcTotals(lineItems, taxRate);

    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE invoices SET
         status     = COALESCE($3, status),
         line_items = $4::jsonb,
         subtotal   = $5,
         tax_rate   = $6,
         tax_amount = $7,
         total      = $8,
         notes      = COALESCE($9, notes),
         due_date   = COALESCE($10::date, due_date),
         paid_at    = COALESCE($11::timestamptz, paid_at)
       WHERE id = $1::uuid AND tenant_id = $2
       RETURNING id, tenant_id as "tenantId", contact_id as "contactId",
                 invoice_number as "invoiceNumber", status,
                 line_items as "lineItems", subtotal, tax_rate as "taxRate",
                 tax_amount as "taxAmount", total, currency, notes,
                 due_date as "dueDate", paid_at as "paidAt", created_at as "createdAt"`,
      [id, tenantId, patch.status ?? null, JSON.stringify(lineItems), subtotal, taxRate, taxAmount, total,
       patch.notes ?? null, patch.dueDate ?? null, patch.paidAt ?? null],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM invoices WHERE id = $1::uuid AND tenant_id = $2 AND status = 'draft' RETURNING id`,
      [id, tenantId],
    );
    return rows.length > 0;
  }

  async getStats(tenantId: string): Promise<FacturaStats> {
    const rows = await this.db.query<{
      status: string; count: string; totalAmount: string;
    }>(
      `SELECT status, COUNT(*)::text as count, COALESCE(SUM(total),0)::text as "totalAmount"
       FROM invoices WHERE tenant_id = $1 GROUP BY status`,
      [tenantId],
    );
    const stats: FacturaStats = { total: 0, paid: 0, pending: 0, overdue: 0, totalRevenue: 0, pendingRevenue: 0 };
    for (const r of rows) {
      const count = parseInt(r.count, 10);
      const amount = parseFloat(r.totalAmount);
      stats.total += count;
      if (r.status === "paid") { stats.paid += count; stats.totalRevenue += amount; }
      if (r.status === "sent" || r.status === "draft") { stats.pending += count; stats.pendingRevenue += amount; }
      if (r.status === "overdue") { stats.overdue += count; stats.pendingRevenue += amount; }
    }
    return stats;
  }

  generatePdfHtml(factura: Factura, brandName = "Nelvyon", logoUrl?: string): string {
    const fmt = (n: number) => `${n.toFixed(2)} ${factura.currency}`;
    const rows = factura.lineItems.map((i) =>
      `<tr><td>${i.description}</td><td class="r">${i.quantity}</td><td class="r">${fmt(i.unitPrice)}</td><td class="r">${fmt(i.total)}</td></tr>`
    ).join("");

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Factura ${factura.invoiceNumber}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;font-size:13px;color:#111;padding:40px}
  h1{font-size:28px;font-weight:800;color:#0084ff;margin-bottom:4px}
  .meta{color:#555;margin-bottom:32px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
  .logo{font-size:22px;font-weight:700;color:#0084ff}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .badge-draft{background:#f3f4f6;color:#6b7280}
  .badge-sent{background:#dbeafe;color:#1d4ed8}
  .badge-paid{background:#d1fae5;color:#065f46}
  .badge-overdue{background:#fee2e2;color:#991b1b}
  .badge-cancelled{background:#f3f4f6;color:#6b7280}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  thead th{background:#0084ff;color:#fff;padding:10px 12px;text-align:left;font-weight:600}
  thead th.r{text-align:right}
  tbody td{padding:10px 12px;border-bottom:1px solid #e5e7eb}
  .r{text-align:right}
  .totals{margin-top:16px;display:flex;justify-content:flex-end}
  .totals table{width:280px}
  .totals td{padding:6px 12px}
  .totals tr:last-child td{font-weight:700;font-size:15px;border-top:2px solid #0084ff}
  .footer{margin-top:48px;color:#9ca3af;font-size:11px;text-align:center}
  @media print{
    body{padding:0} @page{size:A4;margin:15mm}
    .no-print{display:none}
  }
</style>
</head>
<body>
<div class="header">
  <div>
    ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="height:48px;margin-bottom:8px"/>` : `<div class="logo">${brandName}</div>`}
  </div>
  <div style="text-align:right">
    <h1>FACTURA</h1>
    <div class="meta">${factura.invoiceNumber}</div>
    <span class="badge badge-${factura.status}">${factura.status}</span>
  </div>
</div>

<div style="display:flex;justify-content:space-between;margin-bottom:32px">
  <div>
    <strong>Fecha</strong><br/>
    <span class="meta">${factura.createdAt.slice(0, 10)}</span>
  </div>
  ${factura.dueDate ? `<div><strong>Vencimiento</strong><br/><span class="meta">${factura.dueDate.slice(0, 10)}</span></div>` : ""}
  ${factura.paidAt ? `<div><strong>Pagada</strong><br/><span class="meta">${factura.paidAt.slice(0, 10)}</span></div>` : ""}
</div>

<table>
  <thead>
    <tr>
      <th>Descripción</th>
      <th class="r">Cant.</th>
      <th class="r">Precio unit.</th>
      <th class="r">Total</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

<div class="totals">
  <table>
    <tr><td>Subtotal</td><td class="r">${fmt(factura.subtotal)}</td></tr>
    <tr><td>IVA (${factura.taxRate}%)</td><td class="r">${fmt(factura.taxAmount)}</td></tr>
    <tr><td>TOTAL</td><td class="r">${fmt(factura.total)}</td></tr>
  </table>
</div>

${factura.notes ? `<div style="margin-top:32px"><strong>Notas</strong><p style="margin-top:8px;color:#555">${factura.notes}</p></div>` : ""}

<div class="footer">${brandName} · Generado por Nelvyon</div>

<div class="no-print" style="margin-top:32px;text-align:center">
  <button onclick="window.print()" style="background:#0084ff;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer">
    Descargar PDF (Ctrl+P → Guardar como PDF)
  </button>
</div>
</body>
</html>`;
  }
}

let _svc: SaasFacturasService | undefined;
export function getSaasFacturasService(): SaasFacturasService {
  if (!_svc) _svc = new SaasFacturasService();
  return _svc;
}
export function resetSaasFacturasServiceForTests(): void {
  _svc = undefined;
}
