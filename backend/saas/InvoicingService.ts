import { randomBytes } from "crypto";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LLM_DEFAULT_MAX_TOKENS, LLM_DEFAULT_MODEL, LlmClient } from "../os-agents/LlmClient";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

export type CreateInvoiceInput = {
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: InvoiceItemInput[];
  currency: string;
  dueDate: string;
  notes?: string;
  logoUrl?: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
};

export type InvoiceRecord = {
  id: string;
  userId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string | null;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  dueDate: string;
  notes: string | null;
  logoUrl: string | null;
  status: InvoiceStatus;
  paymentToken: string | null;
  sentAt: string | null;
  paidAt: string | null;
  paidMethod: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceFilters = {
  status?: InvoiceStatus;
  fromDate?: string;
  toDate?: string;
};

export type InvoiceStats = {
  totalInvoiced: number;
  paid: number;
  pending: number;
  overdue: number;
  averagePaymentDays: number;
};

export type InvoicingServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

const PDF_TEMPERATURE = 0.1;
const REMINDER_TEMPERATURE = 0.1;

type InvoiceDbRow = {
  id: string;
  user_id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string | null;
  items: unknown;
  subtotal: number | string;
  tax_total: number | string;
  total: number | string;
  currency: string;
  due_date: string | Date;
  notes: string | null;
  logo_url: string | null;
  status: string;
  payment_token: string | null;
  sent_at: string | Date | null;
  paid_at: string | Date | null;
  paid_method: string | null;
  voided_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function toIsoDate(v: string | Date): string {
  if (typeof v === "string") return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

function toIsoDateTime(v: string | Date | null): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.toISOString();
}

function asNumber(n: number | string): number {
  return typeof n === "number" ? n : Number(n);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function asArrayOfItems(v: unknown): InvoiceItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    return {
      description: String(r.description ?? ""),
      quantity: Number(r.quantity ?? 0),
      unitPrice: Number(r.unitPrice ?? 0),
      taxRate: Number(r.taxRate ?? 0),
      lineSubtotal: Number(r.lineSubtotal ?? 0),
      lineTax: Number(r.lineTax ?? 0),
      lineTotal: Number(r.lineTotal ?? 0),
    };
  });
}

function mapInvoiceRow(r: InvoiceDbRow): InvoiceRecord {
  return {
    id: r.id,
    userId: r.user_id,
    invoiceNumber: r.invoice_number,
    clientName: r.client_name,
    clientEmail: r.client_email,
    clientAddress: r.client_address,
    items: asArrayOfItems(r.items),
    subtotal: asNumber(r.subtotal),
    taxTotal: asNumber(r.tax_total),
    total: asNumber(r.total),
    currency: r.currency,
    dueDate: toIsoDate(r.due_date),
    notes: r.notes,
    logoUrl: r.logo_url,
    status: (r.status as InvoiceStatus) ?? "draft",
    paymentToken: r.payment_token,
    sentAt: toIsoDateTime(r.sent_at),
    paidAt: toIsoDateTime(r.paid_at),
    paidMethod: r.paid_method,
    voidedAt: toIsoDateTime(r.voided_at),
    createdAt: toIsoDateTime(r.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoDateTime(r.updated_at) ?? new Date().toISOString(),
  };
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function createInvoiceNumber(): string {
  const y = new Date().getFullYear();
  const n = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `INV-${y}-${n}`;
}

function createPaymentToken(): string {
  return randomBytes(24).toString("hex");
}

function calculate(inputItems: InvoiceItemInput[]): { items: InvoiceItem[]; subtotal: number; taxTotal: number; total: number } {
  const items = inputItems.map((it) => {
    const quantity = round2(Number(it.quantity || 0));
    const unitPrice = round2(Number(it.unitPrice || 0));
    const taxRate = round2(Number(it.taxRate || 0));
    const lineSubtotal = round2(quantity * unitPrice);
    const lineTax = round2(lineSubtotal * (taxRate / 100));
    const lineTotal = round2(lineSubtotal + lineTax);
    return {
      description: it.description.trim(),
      quantity,
      unitPrice,
      taxRate,
      lineSubtotal,
      lineTax,
      lineTotal,
    };
  });
  const subtotal = round2(items.reduce((acc, it) => acc + it.lineSubtotal, 0));
  const taxTotal = round2(items.reduce((acc, it) => acc + it.lineTax, 0));
  const total = round2(subtotal + taxTotal);
  return { items, subtotal, taxTotal, total };
}

export class InvoicingService {
  constructor(private readonly deps: InvoicingServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async createInvoice(userId: string, input: CreateInvoiceInput): Promise<InvoiceRecord> {
    if (!input.clientName.trim()) throw new Error("clientName requerido");
    if (!input.clientEmail.trim()) throw new Error("clientEmail requerido");
    if (!input.dueDate.trim()) throw new Error("dueDate requerido");
    if (!Array.isArray(input.items) || input.items.length === 0) throw new Error("items requeridos");

    const calc = calculate(input.items);
    const invoiceNumber = createInvoiceNumber();
    const rows = await this.db.query<InvoiceDbRow>(
      `INSERT INTO invoices (
         user_id, invoice_number, client_name, client_email, client_address, items,
         subtotal, tax_total, total, currency, due_date, notes, logo_url, status
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, $6::jsonb,
         $7, $8, $9, $10, $11::date, $12, $13, 'draft'
       )
       RETURNING id::text, user_id::text, invoice_number, client_name, client_email, client_address,
                 items, subtotal, tax_total, total, currency, due_date, notes, logo_url, status,
                 payment_token, sent_at, paid_at, paid_method, voided_at, created_at, updated_at`,
      [
        userId,
        invoiceNumber,
        input.clientName.trim(),
        input.clientEmail.trim(),
        input.clientAddress?.trim() || null,
        JSON.stringify(calc.items),
        calc.subtotal,
        calc.taxTotal,
        calc.total,
        input.currency.trim().toUpperCase() || "EUR",
        input.dueDate,
        input.notes?.trim() || null,
        input.logoUrl?.trim() || null,
      ],
    );
    const r = rows[0];
    if (!r) throw new Error("createInvoice falló");
    return mapInvoiceRow(r);
  }

  async generateInvoicePDF(invoiceId: string, userId: string): Promise<{ htmlContent: string }> {
    const invoice = await this.getInvoice(invoiceId, userId);
    if (!invoice) throw new Error("Factura no encontrada");
    const prompt = `Genera HTML profesional de factura comercial en español, listo para imprimir.
Sin markdown, solo HTML completo con estilos inline sobrios.
Incluye logo si existe (${invoice.logoUrl ?? "sin logo"}), cabecera, datos emisor genérico "Nelvyon OS",
cliente, tabla de items, subtotal, impuestos, total, notas y estado.
Datos:
${JSON.stringify(invoice)}`;
    const htmlContent = await this.llm.complete(prompt, {
      model: LLM_DEFAULT_MODEL,
      maxTokens: LLM_DEFAULT_MAX_TOKENS,
      temperature: PDF_TEMPERATURE,
    });
    return { htmlContent };
  }

  async sendInvoice(invoiceId: string, userId: string): Promise<InvoiceRecord | null> {
    const token = createPaymentToken();
    const rows = await this.db.query<InvoiceDbRow>(
      `UPDATE invoices
       SET status = 'sent',
           sent_at = NOW(),
           payment_token = $3,
           updated_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid AND status <> 'void'
       RETURNING id::text, user_id::text, invoice_number, client_name, client_email, client_address,
                 items, subtotal, tax_total, total, currency, due_date, notes, logo_url, status,
                 payment_token, sent_at, paid_at, paid_method, voided_at, created_at, updated_at`,
      [invoiceId, userId, token],
    );
    return rows[0] ? mapInvoiceRow(rows[0]) : null;
  }

  async markPaid(invoiceId: string, userId: string, paymentMethod?: string): Promise<InvoiceRecord | null> {
    const rows = await this.db.query<InvoiceDbRow>(
      `UPDATE invoices
       SET status = 'paid',
           paid_at = NOW(),
           paid_method = $3,
           updated_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid AND status IN ('sent','overdue','draft')
       RETURNING id::text, user_id::text, invoice_number, client_name, client_email, client_address,
                 items, subtotal, tax_total, total, currency, due_date, notes, logo_url, status,
                 payment_token, sent_at, paid_at, paid_method, voided_at, created_at, updated_at`,
      [invoiceId, userId, paymentMethod?.trim() || null],
    );
    return rows[0] ? mapInvoiceRow(rows[0]) : null;
  }

  async sendReminder(invoiceId: string, userId: string): Promise<{ subject: string; body: string }> {
    const invoice = await this.getInvoice(invoiceId, userId);
    if (!invoice) throw new Error("Factura no encontrada");
    const due = new Date(`${invoice.dueDate}T00:00:00.000Z`).getTime();
    const now = Date.now();
    const overdueDays = due < now ? Math.floor((now - due) / 86_400_000) : 0;
    const prompt = `Escribe recordatorio de pago en español, profesional y persuasivo.
Factura: ${invoice.invoiceNumber}, cliente: ${invoice.clientName}, total: ${invoice.total} ${invoice.currency}, vencimiento: ${invoice.dueDate}, días vencida: ${overdueDays}.
Devuelve SOLO JSON:
{"subject":"...", "body":"..."}
`;
    const raw = await this.llm.complete(prompt, {
      model: LLM_DEFAULT_MODEL,
      maxTokens: 600,
      temperature: REMINDER_TEMPERATURE,
    });
    const payload = extractJsonPayload(raw);
    const parsed = JSON.parse(payload) as { subject?: unknown; body?: unknown };
    return {
      subject: typeof parsed.subject === "string" ? parsed.subject : `Recordatorio de pago: ${invoice.invoiceNumber}`,
      body: typeof parsed.body === "string" ? parsed.body : "Este es un recordatorio de pago pendiente.",
    };
  }

  async voidInvoice(invoiceId: string, userId: string): Promise<InvoiceRecord | null> {
    const rows = await this.db.query<InvoiceDbRow>(
      `UPDATE invoices
       SET status = 'void',
           voided_at = NOW(),
           updated_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid AND status <> 'paid'
       RETURNING id::text, user_id::text, invoice_number, client_name, client_email, client_address,
                 items, subtotal, tax_total, total, currency, due_date, notes, logo_url, status,
                 payment_token, sent_at, paid_at, paid_method, voided_at, created_at, updated_at`,
      [invoiceId, userId],
    );
    return rows[0] ? mapInvoiceRow(rows[0]) : null;
  }

  async getInvoices(userId: string, filters?: InvoiceFilters): Promise<InvoiceRecord[]> {
    const params: unknown[] = [userId];
    const where: string[] = ["user_id = $1::uuid"];
    if (filters?.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }
    if (filters?.fromDate) {
      params.push(filters.fromDate);
      where.push(`due_date >= $${params.length}::date`);
    }
    if (filters?.toDate) {
      params.push(filters.toDate);
      where.push(`due_date <= $${params.length}::date`);
    }
    const rows = await this.db.query<InvoiceDbRow>(
      `SELECT id::text, user_id::text, invoice_number, client_name, client_email, client_address,
              items, subtotal, tax_total, total, currency, due_date, notes, logo_url, status,
              payment_token, sent_at, paid_at, paid_method, voided_at, created_at, updated_at
       FROM invoices
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC`,
      params,
    );
    return rows.map(mapInvoiceRow).map((inv) => {
      if ((inv.status === "sent" || inv.status === "draft") && new Date(`${inv.dueDate}T23:59:59.000Z`).getTime() < Date.now()) {
        return { ...inv, status: "overdue" };
      }
      return inv;
    });
  }

  async getInvoice(invoiceId: string, userId: string): Promise<InvoiceRecord | null> {
    const rows = await this.db.query<InvoiceDbRow>(
      `SELECT id::text, user_id::text, invoice_number, client_name, client_email, client_address,
              items, subtotal, tax_total, total, currency, due_date, notes, logo_url, status,
              payment_token, sent_at, paid_at, paid_method, voided_at, created_at, updated_at
       FROM invoices
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [invoiceId, userId],
    );
    const r = rows[0];
    if (!r) return null;
    const inv = mapInvoiceRow(r);
    if ((inv.status === "sent" || inv.status === "draft") && new Date(`${inv.dueDate}T23:59:59.000Z`).getTime() < Date.now()) {
      return { ...inv, status: "overdue" };
    }
    return inv;
  }

  async getStats(userId: string): Promise<InvoiceStats> {
    const sums = await this.db.query<{
      total_invoiced: number | string;
      paid: number | string;
      pending: number | string;
      overdue: number | string;
    }>(
      `SELECT
         COALESCE(SUM(total), 0) AS total_invoiced,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status IN ('draft','sent') THEN total ELSE 0 END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status IN ('draft','sent') AND due_date < CURRENT_DATE THEN total ELSE 0 END), 0) AS overdue
       FROM invoices
       WHERE user_id = $1::uuid`,
      [userId],
    );
    const avgRows = await this.db.query<{ avg_days: number | string | null }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (paid_at - sent_at)) / 86400.0) AS avg_days
       FROM invoices
       WHERE user_id = $1::uuid AND paid_at IS NOT NULL AND sent_at IS NOT NULL`,
      [userId],
    );
    return {
      totalInvoiced: round2(asNumber(sums[0]?.total_invoiced ?? 0)),
      paid: round2(asNumber(sums[0]?.paid ?? 0)),
      pending: round2(asNumber(sums[0]?.pending ?? 0)),
      overdue: round2(asNumber(sums[0]?.overdue ?? 0)),
      averagePaymentDays: round2(asNumber(avgRows[0]?.avg_days ?? 0)),
    };
  }
}

let cachedInvoicingService: InvoicingService | undefined;

export function getInvoicingService(): InvoicingService {
  if (!cachedInvoicingService) cachedInvoicingService = new InvoicingService();
  return cachedInvoicingService;
}

export function resetInvoicingServiceForTests(): void {
  cachedInvoicingService = undefined;
}
