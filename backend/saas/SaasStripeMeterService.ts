/**
 * S59 — Stripe metered billing hooks (client pays overage, not platform).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type MeterKey = "sms" | "email" | "api_calls";

export class SaasStripeMeterService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async registerMeterItem(tenantId: string, meterKey: MeterKey, stripeSubscriptionItemId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_stripe_meter_items (tenant_id, meter_key, stripe_subscription_item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, meter_key) DO UPDATE SET
         stripe_subscription_item_id = EXCLUDED.stripe_subscription_item_id,
         updated_at = NOW()`,
      [tenantId, meterKey, stripeSubscriptionItemId],
    );
  }

  async reportUsage(tenantId: string, meterKey: MeterKey, quantity: number): Promise<boolean> {
    if (quantity <= 0) return false;
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) return false;

    const rows = await this.db.query<{ stripe_subscription_item_id: string }>(
      `SELECT stripe_subscription_item_id FROM saas_stripe_meter_items
       WHERE tenant_id = $1 AND meter_key = $2 LIMIT 1`,
      [tenantId, meterKey],
    );
    const itemId = rows[0]?.stripe_subscription_item_id;
    if (!itemId) return false;

    try {
      const body = new URLSearchParams({
        quantity: String(Math.min(quantity, 100_000)),
        timestamp: String(Math.floor(Date.now() / 1000)),
        action: "increment",
      });
      const res = await fetch(
        `https://api.stripe.com/v1/subscription_items/${itemId}/usage_records`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
          signal: AbortSignal.timeout(15_000),
        },
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Flush yesterday's meter totals to Stripe (cron). */
  async flushDailyMeters(): Promise<{ reported: number }> {
    const rows = await this.db.query<{ tenant_id: string; emails_sent: string; sms_sent: string; api_calls: string }>(
      `SELECT tenant_id, emails_sent::text, sms_sent::text, api_calls::text
       FROM saas_usage_meter_daily
       WHERE meter_date = CURRENT_DATE - INTERVAL '1 day'`,
    );
    let reported = 0;
    for (const r of rows) {
      if (Number(r.emails_sent) > 0 && await this.reportUsage(String(r.tenant_id), "email", Number(r.emails_sent))) {
        reported++;
      }
      if (Number(r.sms_sent) > 0 && await this.reportUsage(String(r.tenant_id), "sms", Number(r.sms_sent))) {
        reported++;
      }
      if (Number(r.api_calls) > 0 && await this.reportUsage(String(r.tenant_id), "api_calls", Number(r.api_calls))) {
        reported++;
      }
    }
    return { reported };
  }
}

let _svc: SaasStripeMeterService | undefined;
export function getSaasStripeMeterService(): SaasStripeMeterService {
  _svc ??= new SaasStripeMeterService();
  return _svc;
}
export function resetSaasStripeMeterServiceForTests(): void {
  _svc = undefined;
}
