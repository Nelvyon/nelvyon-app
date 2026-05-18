import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue";

export interface Invoice {
  id: string;
  userId: string;
  tenantId: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  amountEur: number;
  status: InvoiceStatus;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  pdfUrl: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export type SaasInvoiceServiceDeps = {
  db?: Pick<DbClient, "query">;
};

export class SaasInvoiceService {
  constructor(private readonly deps: SaasInvoiceServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async generateMonthlyInvoice(userId: string, tenantId: string, periodStart: Date, periodEnd: Date): Promise<Invoice> {
    const contracts = await this.db.query<{ service_id: string; plan: string; amount_eur: number | null }>(
      `SELECT service_id, plan, amount_eur FROM os_service_contracts
       WHERE client_id = $1 AND tenant_id = $2::uuid AND status = 'active'`,
      [userId, tenantId],
    );

    const lineItems = contracts.map((c) => ({
      description: `Servicio ${c.service_id.replace(/_/g, " ")} — ${c.plan}`,
      quantity: 1,
      unitPrice: c.amount_eur ?? 97,
      total: c.amount_eur ?? 97,
    }));

    const amountEur = lineItems.reduce((sum, item) => sum + item.total, 0) || 97;

    const countRows = await this.db.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM saas_invoices WHERE tenant_id = $1`, [tenantId]);
    const count = parseInt(countRows[0]?.count ?? "0", 10) + 1;
    const invoiceNumber = `NEL-${new Date().getFullYear()}-${String(count).padStart(6, "0")}`;

    const rows = await this.db.query<Invoice>(
      `INSERT INTO saas_invoices
         (user_id, tenant_id, invoice_number, period_start, period_end, amount_eur, status, line_items)
       VALUES ($1, $2, $3, $4, $5, $6, 'issued', $7::jsonb)
       RETURNING id, user_id as "userId", tenant_id as "tenantId",
                 invoice_number as "invoiceNumber",
                 period_start as "periodStart", period_end as "periodEnd",
                 amount_eur as "amountEur", status,
                 line_items as "lineItems", pdf_url as "pdfUrl",
                 issued_at as "issuedAt", paid_at as "paidAt",
                 created_at as "createdAt"`,
      [userId, tenantId, invoiceNumber, periodStart.toISOString(), periodEnd.toISOString(), amountEur, JSON.stringify(lineItems)],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasInvoiceService.generateMonthlyInvoice: INSERT returned no row");

    logger.info(`[INVOICE] Factura generada: ${invoiceNumber} — ${amountEur}€ para ${userId}`);
    return row;
  }

  async getInvoices(userId: string, tenantId: string): Promise<Invoice[]> {
    return this.db.query<Invoice>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId",
              invoice_number as "invoiceNumber",
              period_start as "periodStart", period_end as "periodEnd",
              amount_eur as "amountEur", status,
              line_items as "lineItems", pdf_url as "pdfUrl",
              issued_at as "issuedAt", paid_at as "paidAt",
              created_at as "createdAt"
       FROM saas_invoices WHERE user_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC`,
      [userId, tenantId],
    );
  }

  async getInvoiceById(id: string, userId: string): Promise<Invoice | null> {
    const rows = await this.db.query<Invoice>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId",
              invoice_number as "invoiceNumber",
              period_start as "periodStart", period_end as "periodEnd",
              amount_eur as "amountEur", status,
              line_items as "lineItems", pdf_url as "pdfUrl",
              issued_at as "issuedAt", paid_at as "paidAt",
              created_at as "createdAt"
       FROM saas_invoices WHERE id = $1::uuid AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async markAsPaid(id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_invoices SET status = 'paid', paid_at = NOW()
       WHERE id = $1::uuid AND status != 'paid' RETURNING id`,
      [id],
    );
    return rows.length > 0;
  }
}

export const saasInvoiceService = new SaasInvoiceService();
