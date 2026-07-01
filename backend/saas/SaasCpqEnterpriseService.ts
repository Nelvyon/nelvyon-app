import { randomBytes } from "crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContractStatus = "draft" | "sent" | "signed" | "active" | "expired" | "cancelled";
export type BillingInterval = "month" | "year" | "one_time";
export type DunningChannel = "email" | "sms";
export type DunningStatus = "pending" | "sent" | "failed" | "skipped";

export interface SaasContract {
  id: string;
  tenantId: string;
  quoteId: string | null;
  dealId: string | null;
  contractNumber: string;
  title: string;
  clientName: string;
  clientEmail: string;
  currency: string;
  amount: number;
  billingInterval: BillingInterval;
  status: ContractStatus;
  signedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  autoRenew: boolean;
  termsHtml: string | null;
  signatureToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractInput {
  quoteId?: string;
  dealId?: string;
  title: string;
  clientName: string;
  clientEmail: string;
  currency?: string;
  amount: number;
  billingInterval?: BillingInterval;
  termsHtml?: string;
  startsAt?: string;
  endsAt?: string;
  autoRenew?: boolean;
}

export interface SaasDunningEvent {
  id: string;
  tenantId: string;
  invoiceId: string;
  attemptNumber: number;
  channel: DunningChannel;
  status: DunningStatus;
  scheduledAt: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface DunningSummary {
  overdueCount: number;
  totalOverdueAmount: number;
  pendingAttempts: number;
  nextAction: SaasDunningEvent | null;
}

export interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  fetchedAt: string;
}

export class SaasCpqEnterpriseError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION" | "INVALID_STATUS") {
    super(message);
    this.name = "SaasCpqEnterpriseError";
  }
}

// ── Row mappers ───────────────────────────────────────────────────────────────

interface ContractRow {
  id: string; tenant_id: string; quote_id: string | null; deal_id: string | null;
  contract_number: string; title: string; client_name: string; client_email: string;
  currency: string; amount: string; billing_interval: string; status: string;
  signed_at: string | null; starts_at: string | null; ends_at: string | null;
  auto_renew: boolean; terms_html: string | null; signature_token: string;
  created_at: string; updated_at: string;
}

function mapContract(r: ContractRow): SaasContract {
  return {
    id: r.id, tenantId: r.tenant_id, quoteId: r.quote_id, dealId: r.deal_id,
    contractNumber: r.contract_number, title: r.title,
    clientName: r.client_name, clientEmail: r.client_email,
    currency: r.currency, amount: Number(r.amount),
    billingInterval: r.billing_interval as BillingInterval,
    status: r.status as ContractStatus,
    signedAt: r.signed_at, startsAt: r.starts_at, endsAt: r.ends_at,
    autoRenew: r.auto_renew, termsHtml: r.terms_html,
    signatureToken: r.signature_token,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

interface DunningRow {
  id: string; tenant_id: string; invoice_id: string; attempt_number: number;
  channel: string; status: string; scheduled_at: string; sent_at: string | null;
  error_message: string | null; created_at: string;
}

function mapDunning(r: DunningRow): SaasDunningEvent {
  return {
    id: r.id, tenantId: r.tenant_id, invoiceId: r.invoice_id,
    attemptNumber: r.attempt_number, channel: r.channel as DunningChannel,
    status: r.status as DunningStatus, scheduledAt: r.scheduled_at,
    sentAt: r.sent_at, errorMessage: r.error_message, createdAt: r.created_at,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasCpqEnterpriseService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Contracts ──────────────────────────────────────────────────────────────

  private nextContractNumber(): string {
    const now = new Date();
    const y = now.getFullYear();
    const rnd = randomBytes(3).toString("hex").toUpperCase();
    return `CTR-${y}-${rnd}`;
  }

  async createContract(tenantId: string, input: CreateContractInput): Promise<SaasContract> {
    if (!input.title?.trim()) throw new SaasCpqEnterpriseError("Title is required", "VALIDATION");
    if (!input.clientName?.trim()) throw new SaasCpqEnterpriseError("Client name is required", "VALIDATION");
    if (!input.clientEmail?.trim()) throw new SaasCpqEnterpriseError("Client email is required", "VALIDATION");

    const rows = await this.db.query<ContractRow>(
      `INSERT INTO saas_contracts
         (tenant_id, quote_id, deal_id, contract_number, title, client_name, client_email,
          currency, amount, billing_interval, terms_html, starts_at, ends_at, auto_renew)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        tenantId,
        input.quoteId ?? null,
        input.dealId ?? null,
        this.nextContractNumber(),
        input.title.trim(),
        input.clientName.trim(),
        input.clientEmail.trim(),
        input.currency ?? "EUR",
        input.amount,
        input.billingInterval ?? "one_time",
        input.termsHtml ?? null,
        input.startsAt ?? null,
        input.endsAt ?? null,
        input.autoRenew ?? false,
      ],
    );
    return mapContract(rows[0]);
  }

  async createContractFromQuote(tenantId: string, quoteId: string): Promise<SaasContract> {
    const quotes = await this.db.query<{
      id: string; title: string; client_name: string; client_email: string | null;
      currency: string; total: string; status: string;
    }>(
      `SELECT id, title, client_name, client_email, currency, total, status
       FROM saas_quotes WHERE id=$1::uuid AND tenant_id=$2 LIMIT 1`,
      [quoteId, tenantId],
    );
    const q = quotes[0];
    if (!q) throw new SaasCpqEnterpriseError("Quote not found", "NOT_FOUND");
    if (q.status !== "accepted") throw new SaasCpqEnterpriseError("Only accepted quotes can be converted to contract", "INVALID_STATUS");

    return this.createContract(tenantId, {
      quoteId,
      title: q.title,
      clientName: q.client_name,
      clientEmail: q.client_email ?? "",
      currency: q.currency,
      amount: Number(q.total),
    });
  }

  async listContracts(tenantId: string, status?: ContractStatus): Promise<SaasContract[]> {
    const rows = await this.db.query<ContractRow>(
      status
        ? `SELECT * FROM saas_contracts WHERE tenant_id=$1 AND status=$2 ORDER BY created_at DESC`
        : `SELECT * FROM saas_contracts WHERE tenant_id=$1 ORDER BY created_at DESC`,
      status ? [tenantId, status] : [tenantId],
    );
    return rows.map(mapContract);
  }

  async getContract(tenantId: string, id: string): Promise<SaasContract> {
    const rows = await this.db.query<ContractRow>(
      `SELECT * FROM saas_contracts WHERE id=$1::uuid AND tenant_id=$2 LIMIT 1`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasCpqEnterpriseError("Contract not found", "NOT_FOUND");
    return mapContract(rows[0]);
  }

  async sendContract(tenantId: string, id: string, baseUrl: string): Promise<{ signUrl: string }> {
    const rows = await this.db.query<ContractRow>(
      `UPDATE saas_contracts SET status='sent', updated_at=NOW()
       WHERE id=$1::uuid AND tenant_id=$2 AND status='draft'
       RETURNING *`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasCpqEnterpriseError("Contract not found or not in draft status", "NOT_FOUND");
    const contract = mapContract(rows[0]);

    // Send signature email via SES (non-fatal if SES not configured)
    try {
      const { getSesClient } = await import("../email/sesClient");
      const { SendEmailCommand } = await import("@aws-sdk/client-ses");
      const FROM = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";
      const signUrl = `${baseUrl}/contracts/sign/${contract.signatureToken}`;
      await getSesClient().send(new SendEmailCommand({
        Source: FROM,
        Destination: { ToAddresses: [contract.clientEmail] },
        Message: {
          Subject: { Data: `Contrato listo para firmar: ${contract.title}` },
          Body: {
            Html: { Data: `<p>Puede revisar y firmar su contrato aquí:</p><p><a href="${signUrl}">${signUrl}</a></p>` },
            Text: { Data: `Firme su contrato: ${signUrl}` },
          },
        },
      }));
    } catch {
      // Non-fatal — SES may not be configured in dev
    }

    const signUrl = `${baseUrl}/contracts/sign/${contract.signatureToken}`;
    return { signUrl };
  }

  async getContractByToken(token: string): Promise<SaasContract> {
    const rows = await this.db.query<ContractRow>(
      `SELECT * FROM saas_contracts WHERE signature_token=$1 LIMIT 1`,
      [token],
    );
    if (!rows[0]) throw new SaasCpqEnterpriseError("Contract not found", "NOT_FOUND");
    return mapContract(rows[0]);
  }

  async signContract(token: string): Promise<SaasContract> {
    const rows = await this.db.query<ContractRow>(
      `UPDATE saas_contracts
       SET status='signed', signed_at=NOW(), updated_at=NOW()
       WHERE signature_token=$1 AND status IN ('draft','sent')
       RETURNING *`,
      [token],
    );
    if (!rows[0]) throw new SaasCpqEnterpriseError("Invalid or already signed token", "NOT_FOUND");
    return mapContract(rows[0]);
  }

  async cancelContract(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_contracts SET status='cancelled', updated_at=NOW()
       WHERE id=$1::uuid AND tenant_id=$2 AND status NOT IN ('cancelled','expired')
       RETURNING id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasCpqEnterpriseError("Contract not found or already cancelled", "NOT_FOUND");
  }

  async renewContract(tenantId: string, id: string): Promise<SaasContract> {
    const orig = await this.getContract(tenantId, id);
    if (!["signed", "active", "expired"].includes(orig.status)) {
      throw new SaasCpqEnterpriseError("Only signed/active/expired contracts can be renewed", "INVALID_STATUS");
    }
    const newContract = await this.createContract(tenantId, {
      quoteId: orig.quoteId ?? undefined,
      dealId: orig.dealId ?? undefined,
      title: `${orig.title} (renovación)`,
      clientName: orig.clientName,
      clientEmail: orig.clientEmail,
      currency: orig.currency,
      amount: orig.amount,
      billingInterval: orig.billingInterval,
      termsHtml: orig.termsHtml ?? undefined,
      autoRenew: orig.autoRenew,
    });
    return newContract;
  }

  // ── Dunning ────────────────────────────────────────────────────────────────

  async scheduleDunning(tenantId: string, invoiceId: string): Promise<SaasDunningEvent[]> {
    const now = new Date();
    const attempts = [3, 7, 14].map((days, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      return { attemptNumber: i + 1, scheduledAt: d.toISOString() };
    });

    const events: SaasDunningEvent[] = [];
    for (const a of attempts) {
      const rows = await this.db.query<DunningRow>(
        `INSERT INTO saas_dunning_events (tenant_id, invoice_id, attempt_number, scheduled_at)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [tenantId, invoiceId, a.attemptNumber, a.scheduledAt],
      );
      events.push(mapDunning(rows[0]));
    }
    return events;
  }

  async processDueDunning(limit = 50): Promise<{ processed: number; failed: number }> {
    const rows = await this.db.query<DunningRow & { client_email: string | null; invoice_number: string; total: string }>(
      `SELECT d.*, c.email AS client_email, i.invoice_number, i.total
       FROM saas_dunning_events d
       JOIN invoices i ON i.id = d.invoice_id
       LEFT JOIN saas_contacts c ON c.id = i.contact_id
       WHERE d.status = 'pending' AND d.scheduled_at <= NOW()
       ORDER BY d.scheduled_at
       LIMIT $1`,
      [limit],
    );

    let processed = 0;
    let failed = 0;

    for (const row of rows) {
      if (!row.client_email?.trim()) {
        await this.db.query(
          `UPDATE saas_dunning_events SET status='skipped', error_message='no contact email' WHERE id=$1`,
          [row.id],
        );
        continue;
      }
      try {
        const { getSesClient } = await import("../email/sesClient");
        const { SendEmailCommand } = await import("@aws-sdk/client-ses");
        const FROM = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";

        await getSesClient().send(new SendEmailCommand({
          Source: FROM,
          Destination: { ToAddresses: [row.client_email] },
          Message: {
            Subject: { Data: `Recordatorio de pago — Factura ${row.invoice_number}` },
            Body: {
              Html: { Data: `<p>Le recordamos que tiene una factura pendiente de pago por ${row.total}.</p>` },
              Text: { Data: `Factura pendiente: ${row.invoice_number} — Total: ${row.total}` },
            },
          },
        }));

        await this.db.query(
          `UPDATE saas_dunning_events SET status='sent', sent_at=NOW() WHERE id=$1`,
          [row.id],
        );
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.db.query(
          `UPDATE saas_dunning_events SET status='failed', error_message=$1 WHERE id=$2`,
          [msg.slice(0, 500), row.id],
        );
        failed++;
      }
    }
    return { processed, failed };
  }

  async getDunningSummary(tenantId: string): Promise<DunningSummary> {
    const [overdue, pending] = await Promise.all([
      this.db.query<{ cnt: string; total: string }>(
        `SELECT COUNT(*)::text as cnt, COALESCE(SUM(total),0)::text as total
         FROM invoices WHERE tenant_id=$1 AND status='overdue'`,
        [tenantId],
      ),
      this.db.query<DunningRow>(
        `SELECT d.* FROM saas_dunning_events d
         JOIN invoices i ON i.id = d.invoice_id
         WHERE i.tenant_id=$1 AND d.status='pending'
         ORDER BY d.scheduled_at
         LIMIT 1`,
        [tenantId],
      ),
    ]);

    return {
      overdueCount: Number(overdue[0]?.cnt ?? 0),
      totalOverdueAmount: Number(overdue[0]?.total ?? 0),
      pendingAttempts: 0, // populated by caller if needed
      nextAction: pending[0] ? mapDunning(pending[0]) : null,
    };
  }

  async getDunningEvents(tenantId: string, invoiceId: string): Promise<SaasDunningEvent[]> {
    const rows = await this.db.query<DunningRow>(
      `SELECT d.* FROM saas_dunning_events d
       JOIN invoices i ON i.id = d.invoice_id
       WHERE i.tenant_id=$1 AND d.invoice_id=$2::uuid
       ORDER BY d.attempt_number`,
      [tenantId, invoiceId],
    );
    return rows.map(mapDunning);
  }

  // ── Multi-currency ─────────────────────────────────────────────────────────

  async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    if (from === to) {
      return { baseCurrency: from, targetCurrency: to, rate: 1, fetchedAt: new Date().toISOString() };
    }

    const cached = await this.db.query<{ base_currency: string; target_currency: string; rate: string; fetched_at: string }>(
      `SELECT * FROM saas_exchange_rates WHERE base_currency=$1 AND target_currency=$2`,
      [from, to],
    );

    if (cached[0]) {
      return {
        baseCurrency: cached[0].base_currency,
        targetCurrency: cached[0].target_currency,
        rate: Number(cached[0].rate),
        fetchedAt: cached[0].fetched_at,
      };
    }

    // Fallback: try fetching from external API if key configured
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`);
        if (res.ok) {
          const data = await res.json() as { conversion_rate: number };
          const rate = data.conversion_rate;
          await this.db.query(
            `INSERT INTO saas_exchange_rates (base_currency, target_currency, rate)
             VALUES ($1,$2,$3)
             ON CONFLICT (base_currency, target_currency) DO UPDATE SET rate=$3, fetched_at=NOW()`,
            [from, to, rate],
          );
          return { baseCurrency: from, targetCurrency: to, rate, fetchedAt: new Date().toISOString() };
        }
      } catch {
        // Fallback to 1:1
      }
    }

    // Last resort: 1:1 fallback
    return { baseCurrency: from, targetCurrency: to, rate: 1, fetchedAt: new Date().toISOString() };
  }

  async convertQuoteCurrency(tenantId: string, quoteId: string, targetCurrency: string): Promise<{
    quoteId: string;
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    originalTotal: number;
    convertedTotal: number;
  }> {
    const quotes = await this.db.query<{ currency: string; total: string }>(
      `SELECT currency, total FROM saas_quotes WHERE id=$1::uuid AND tenant_id=$2 LIMIT 1`,
      [quoteId, tenantId],
    );
    if (!quotes[0]) throw new SaasCpqEnterpriseError("Quote not found", "NOT_FOUND");

    const { currency: fromCurrency, total } = quotes[0];
    const originalTotal = Number(total);
    const { rate } = await this.getExchangeRate(fromCurrency, targetCurrency);
    const convertedTotal = Math.round(originalTotal * rate * 100) / 100;

    return { quoteId, fromCurrency, toCurrency: targetCurrency, rate, originalTotal, convertedTotal };
  }
}

let _svc: SaasCpqEnterpriseService | null = null;
export function getSaasCpqEnterpriseService(): SaasCpqEnterpriseService {
  if (!_svc) _svc = new SaasCpqEnterpriseService();
  return _svc;
}
export function resetSaasCpqEnterpriseServiceForTests(): void { _svc = null; }
