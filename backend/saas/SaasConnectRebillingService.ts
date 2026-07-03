/**
 * S58 — Stripe Connect rebilling v2: charge subcuenta via agency Connect account.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type RebillingRecord = {
  id: string;
  agencyTenantId: string;
  subcuentaTenantId: string;
  subcuentaId: string | null;
  grossAmountEur: number;
  platformFeeEur: number;
  netAgencyEur: number;
  status: "pending" | "transferred" | "failed";
  stripePaymentIntent: string | null;
  stripeTransferId: string | null;
  invoiceId: string | null;
  rebillingPeriod: string | null;
  description: string | null;
  createdAt: string;
};

export type CreateRebillingInput = {
  agencyTenantId: string;
  subcuentaTenantId: string;
  subcuentaId?: string;
  grossAmountEur: number;
  platformFeeEur: number;
  description?: string;
  invoiceId?: string;
  rebillingPeriod?: string;
  stripeConnectAcct?: string;
};

export class SaasConnectRebillingService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async createPending(input: CreateRebillingInput): Promise<RebillingRecord> {
    const netAgency = input.grossAmountEur - input.platformFeeEur;
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_connect_rebilling
         (agency_tenant_id, subcuenta_tenant_id, subcuenta_id, gross_amount_eur,
          platform_fee_eur, net_agency_eur, status, description, invoice_id,
          rebilling_period, stripe_connect_acct)
       VALUES ($1, $2, $3::uuid, $4, $5, $6, 'pending', $7, $8, $9, $10)
       RETURNING *`,
      [
        input.agencyTenantId,
        input.subcuentaTenantId,
        input.subcuentaId ?? null,
        input.grossAmountEur,
        input.platformFeeEur,
        netAgency,
        input.description ?? null,
        input.invoiceId ?? null,
        input.rebillingPeriod ?? null,
        input.stripeConnectAcct ?? null,
      ],
    );
    return this.mapRow(rows[0]!);
  }

  async markTransferred(id: string, paymentIntent: string, transferId: string): Promise<void> {
    await this.db.query(
      `UPDATE saas_connect_rebilling
       SET status = 'transferred', stripe_payment_intent = $2, stripe_transfer_id = $3
       WHERE id = $1::uuid`,
      [id, paymentIntent, transferId],
    );
  }

  async listForAgency(agencyTenantId: string, limit = 50): Promise<RebillingRecord[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_connect_rebilling
       WHERE agency_tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [agencyTenantId, limit],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async getLedgerSummary(agencyTenantId: string): Promise<{ totalGross: number; totalNet: number; count: number }> {
    const rows = await this.db.query<{ g: string; n: string; c: string }>(
      `SELECT COALESCE(SUM(gross_amount_eur),0)::text AS g,
              COALESCE(SUM(net_agency_eur),0)::text AS n,
              COUNT(*)::text AS c
       FROM saas_connect_rebilling WHERE agency_tenant_id = $1 AND status = 'transferred'`,
      [agencyTenantId],
    );
    return {
      totalGross: Number(rows[0]?.g ?? 0),
      totalNet: Number(rows[0]?.n ?? 0),
      count: Number(rows[0]?.c ?? 0),
    };
  }

  private mapRow(r: Record<string, unknown>): RebillingRecord {
    return {
      id: String(r.id),
      agencyTenantId: String(r.agency_tenant_id),
      subcuentaTenantId: String(r.subcuenta_tenant_id),
      subcuentaId: r.subcuenta_id != null ? String(r.subcuenta_id) : null,
      grossAmountEur: Number(r.gross_amount_eur),
      platformFeeEur: Number(r.platform_fee_eur),
      netAgencyEur: Number(r.net_agency_eur),
      status: String(r.status) as RebillingRecord["status"],
      stripePaymentIntent: r.stripe_payment_intent != null ? String(r.stripe_payment_intent) : null,
      stripeTransferId: r.stripe_transfer_id != null ? String(r.stripe_transfer_id) : null,
      invoiceId: r.invoice_id != null ? String(r.invoice_id) : null,
      rebillingPeriod: r.rebilling_period != null ? String(r.rebilling_period) : null,
      description: r.description != null ? String(r.description) : null,
      createdAt: String(r.created_at),
    };
  }
}

let _svc: SaasConnectRebillingService | undefined;
export function getSaasConnectRebillingService(): SaasConnectRebillingService {
  _svc ??= new SaasConnectRebillingService();
  return _svc;
}
export function resetSaasConnectRebillingServiceForTests(): void {
  _svc = undefined;
}
