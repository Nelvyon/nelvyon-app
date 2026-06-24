import { createHmac } from "crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ──────────────────────────────────────────────────────────────────────

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface QuoteItem {
  id: string;
  quoteId: string;
  tenantId: string;
  sortOrder: number;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaasQuote {
  id: string;
  tenantId: string;
  dealId: string | null;
  quoteNumber: string;
  title: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  currency: string;
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  taxPct: number;
  taxAmount: number;
  total: number;
  status: QuoteStatus;
  validUntil: string | null;
  notes: string | null;
  pdfUrl: string | null;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteInput {
  dealId?: string | null;
  title: string;
  clientName: string;
  clientEmail?: string | null;
  clientAddress?: string | null;
  currency?: string;
  discountPct?: number;
  taxPct?: number;
  validUntil?: string | null;
  notes?: string | null;
  items: Array<{ description: string; quantity?: number; unitPrice: number }>;
}

export class SaasQuotesError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "SaasQuotesError";
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function rowToItem(r: Record<string, unknown>): QuoteItem {
  return {
    id: String(r.id),
    quoteId: String(r.quoteId ?? r.quote_id),
    tenantId: String(r.tenantId ?? r.tenant_id),
    sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
    description: String(r.description),
    quantity: Number(r.quantity ?? 1),
    unitPrice: Number(r.unitPrice ?? r.unit_price ?? 0),
    subtotal: Number(r.subtotal ?? 0),
  };
}

function rowToQuote(r: Record<string, unknown>, items: QuoteItem[]): SaasQuote {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId ?? r.tenant_id),
    dealId: r.dealId != null ? String(r.dealId) : r.deal_id != null ? String(r.deal_id) : null,
    quoteNumber: String(r.quoteNumber ?? r.quote_number),
    title: String(r.title),
    clientName: String(r.clientName ?? r.client_name),
    clientEmail: r.clientEmail != null ? String(r.clientEmail) : r.client_email != null ? String(r.client_email) : null,
    clientAddress: r.clientAddress != null ? String(r.clientAddress) : r.client_address != null ? String(r.client_address) : null,
    currency: String(r.currency ?? "EUR"),
    subtotal: Number(r.subtotal ?? 0),
    discountPct: Number(r.discountPct ?? r.discount_pct ?? 0),
    discountAmount: Number(r.discountAmount ?? r.discount_amount ?? 0),
    taxPct: Number(r.taxPct ?? r.tax_pct ?? 21),
    taxAmount: Number(r.taxAmount ?? r.tax_amount ?? 0),
    total: Number(r.total ?? 0),
    status: String(r.status ?? "draft") as QuoteStatus,
    validUntil: r.validUntil != null ? String(r.validUntil) : r.valid_until != null ? String(r.valid_until) : null,
    notes: r.notes != null ? String(r.notes) : null,
    pdfUrl: r.pdfUrl != null ? String(r.pdfUrl) : r.pdf_url != null ? String(r.pdf_url) : null,
    items,
    createdAt: String(r.createdAt ?? r.created_at),
    updatedAt: String(r.updatedAt ?? r.updated_at),
  };
}

const QUOTE_SEL = `id, tenant_id AS "tenantId", deal_id AS "dealId", quote_number AS "quoteNumber",
  title, client_name AS "clientName", client_email AS "clientEmail",
  client_address AS "clientAddress", currency,
  subtotal, discount_pct AS "discountPct", discount_amount AS "discountAmount",
  tax_pct AS "taxPct", tax_amount AS "taxAmount", total, status,
  valid_until AS "validUntil", notes, pdf_url AS "pdfUrl",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

// ── Service ────────────────────────────────────────────────────────────────────

export class SaasQuotesService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  private async nextQuoteNumber(tenantId: string): Promise<string> {
    const rows = await this.db.query<{ last_seq: string }>(
      `INSERT INTO saas_quote_sequences (tenant_id, last_seq) VALUES ($1, 1)
       ON CONFLICT (tenant_id) DO UPDATE SET last_seq = saas_quote_sequences.last_seq + 1
       RETURNING last_seq`,
      [tenantId],
    );
    const seq = String(rows[0]?.last_seq ?? "1").padStart(4, "0");
    const now = new Date();
    return `Q-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${seq}`;
  }

  private calcTotals(items: CreateQuoteInput["items"], discountPct: number, taxPct: number) {
    const subtotal = items.reduce((s, i) => s + (i.quantity ?? 1) * i.unitPrice, 0);
    const discountAmount = Math.round(subtotal * discountPct) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round(afterDiscount * taxPct) / 100;
    const total = afterDiscount + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
  }

  async list(tenantId: string, opts?: { dealId?: string; status?: QuoteStatus }): Promise<SaasQuote[]> {
    const conds = [`q.tenant_id = $1`];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (opts?.dealId) { conds.push(`q.deal_id = $${i++}::uuid`); params.push(opts.dealId); }
    if (opts?.status) { conds.push(`q.status = $${i++}`); params.push(opts.status); }
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${QUOTE_SEL} FROM saas_quotes q WHERE ${conds.join(" AND ")} ORDER BY q.created_at DESC`,
      params,
    );
    if (!rows.length) return [];
    const ids = rows.map(r => String(r.id));
    const itemRows = await this.db.query<Record<string, unknown>>(
      `SELECT id, quote_id AS "quoteId", tenant_id AS "tenantId", sort_order AS "sortOrder",
              description, quantity, unit_price AS "unitPrice", subtotal
       FROM saas_quote_items WHERE quote_id = ANY($1::uuid[]) ORDER BY quote_id, sort_order`,
      [ids],
    );
    const itemMap = new Map<string, QuoteItem[]>();
    for (const ir of itemRows) {
      const qid = String(ir.quoteId);
      const list = itemMap.get(qid) ?? [];
      list.push(rowToItem(ir));
      itemMap.set(qid, list);
    }
    return rows.map(r => rowToQuote(r, itemMap.get(String(r.id)) ?? []));
  }

  async get(tenantId: string, id: string): Promise<SaasQuote> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${QUOTE_SEL} FROM saas_quotes q WHERE q.id = $1::uuid AND q.tenant_id = $2`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasQuotesError("Presupuesto no encontrado", "NOT_FOUND");
    const itemRows = await this.db.query<Record<string, unknown>>(
      `SELECT id, quote_id AS "quoteId", tenant_id AS "tenantId", sort_order AS "sortOrder",
              description, quantity, unit_price AS "unitPrice", subtotal
       FROM saas_quote_items WHERE quote_id = $1::uuid ORDER BY sort_order`,
      [id],
    );
    return rowToQuote(rows[0], itemRows.map(rowToItem));
  }

  async create(tenantId: string, input: CreateQuoteInput): Promise<SaasQuote> {
    if (!input.title?.trim()) throw new SaasQuotesError("title es obligatorio", "VALIDATION");
    if (!input.clientName?.trim()) throw new SaasQuotesError("clientName es obligatorio", "VALIDATION");
    if (!input.items?.length) throw new SaasQuotesError("Debe incluir al menos un ítem", "VALIDATION");

    const discountPct = input.discountPct ?? 0;
    const taxPct = input.taxPct ?? 21;
    const { subtotal, discountAmount, taxAmount, total } = this.calcTotals(input.items, discountPct, taxPct);
    const quoteNumber = await this.nextQuoteNumber(tenantId);

    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_quotes
         (tenant_id, deal_id, quote_number, title, client_name, client_email, client_address,
          currency, subtotal, discount_pct, discount_amount, tax_pct, tax_amount, total,
          valid_until, notes)
       VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING ${QUOTE_SEL}`,
      [
        tenantId, input.dealId ?? null, quoteNumber, input.title.trim(),
        input.clientName.trim(), input.clientEmail ?? null, input.clientAddress ?? null,
        input.currency ?? "EUR",
        subtotal, discountPct, discountAmount, taxPct, taxAmount, total,
        input.validUntil ?? null, input.notes ?? null,
      ],
    );
    const quote = rows[0];
    if (!quote) throw new Error("INSERT quote returned no row");

    const quoteId = String(quote.id);
    const items: QuoteItem[] = [];
    for (let i = 0; i < input.items.length; i++) {
      const it = input.items[i]!;
      const iRows = await this.db.query<Record<string, unknown>>(
        `INSERT INTO saas_quote_items (quote_id, tenant_id, sort_order, description, quantity, unit_price)
         VALUES ($1::uuid,$2,$3,$4,$5,$6)
         RETURNING id, quote_id AS "quoteId", tenant_id AS "tenantId", sort_order AS "sortOrder",
                   description, quantity, unit_price AS "unitPrice", subtotal`,
        [quoteId, tenantId, i, it.description.trim(), it.quantity ?? 1, it.unitPrice],
      );
      if (iRows[0]) items.push(rowToItem(iRows[0]));
    }
    return rowToQuote(quote, items);
  }

  async updateStatus(tenantId: string, id: string, status: QuoteStatus): Promise<SaasQuote> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_quotes SET status=$3, updated_at=NOW()
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING ${QUOTE_SEL}`,
      [id, tenantId, status],
    );
    if (!rows[0]) throw new SaasQuotesError("Presupuesto no encontrado", "NOT_FOUND");
    return this.get(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_quotes WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasQuotesError("Presupuesto no encontrado", "NOT_FOUND");
  }

  // ── PDF HTML — HMAC-signed inline render ─────────────────────────────────

  renderQuotePdfHtml(quote: SaasQuote, agencyName = "Nelvyon"): string {
    const fmt = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: quote.currency }).format(n);
    const rows = quote.items.map(it => `
      <tr>
        <td>${it.description}</td>
        <td style="text-align:right">${it.quantity}</td>
        <td style="text-align:right">${fmt(it.unitPrice)}</td>
        <td style="text-align:right">${fmt(it.subtotal)}</td>
      </tr>`).join("");

    const sig = createHmac("sha256", process.env.JWT_SECRET ?? "dev-secret")
      .update(`quote:${quote.id}`)
      .digest("hex")
      .slice(0, 16);

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<title>Presupuesto ${quote.quoteNumber}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #111; font-size: 14px; }
  h1 { color: #0084ff; } .meta { color: #666; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th { background: #f4f4f4; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .totals td { border: none; } .total-row td { font-weight: bold; font-size: 16px; color: #0084ff; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; background: #e0f0ff; color: #0084ff; }
</style>
</head>
<body>
<div style="display:flex;justify-content:space-between;align-items:flex-start">
  <div><h1>${agencyName}</h1></div>
  <div style="text-align:right">
    <p class="meta">Nº: <strong>${quote.quoteNumber}</strong></p>
    <p class="meta">Fecha: ${new Date(quote.createdAt).toLocaleDateString("es-ES")}</p>
    ${quote.validUntil ? `<p class="meta">Válido hasta: ${new Date(quote.validUntil).toLocaleDateString("es-ES")}</p>` : ""}
    <span class="badge">${quote.status.toUpperCase()}</span>
  </div>
</div>
<hr/>
<h2>${quote.title}</h2>
<p><strong>${quote.clientName}</strong>${quote.clientEmail ? ` · ${quote.clientEmail}` : ""}${quote.clientAddress ? `<br/><small>${quote.clientAddress}</small>` : ""}</p>
<table>
  <thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="totals" style="width:300px;margin-left:auto">
  <tr><td>Subtotal</td><td style="text-align:right">${fmt(quote.subtotal)}</td></tr>
  ${quote.discountAmount > 0 ? `<tr><td>Descuento (${quote.discountPct}%)</td><td style="text-align:right">-${fmt(quote.discountAmount)}</td></tr>` : ""}
  <tr><td>IVA (${quote.taxPct}%)</td><td style="text-align:right">${fmt(quote.taxAmount)}</td></tr>
  <tr class="total-row"><td><strong>TOTAL</strong></td><td style="text-align:right"><strong>${fmt(quote.total)}</strong></td></tr>
</table>
${quote.notes ? `<p style="background:#f9f9f9;padding:12px;border-radius:6px;font-size:13px">${quote.notes}</p>` : ""}
<div class="footer">Generado por ${agencyName} · ref: ${sig}</div>
</body></html>`;
  }
}

let _svc: SaasQuotesService | undefined;
export function getSaasQuotesService(): SaasQuotesService {
  _svc ??= new SaasQuotesService();
  return _svc;
}
export function resetSaasQuotesServiceForTests(): void {
  _svc = undefined;
}
