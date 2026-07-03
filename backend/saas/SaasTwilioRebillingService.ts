/**
 * S59 — Twilio usage rebilling ledger (agency marks up SMS/voice for subcuentas).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type TwilioRebillingEntry = {
  id: string;
  agencyTenantId: string;
  subcuentaId: string;
  period: string;
  smsCount: number;
  voiceMinutes: number;
  costEur: number;
  retailEur: number;
  status: "pending" | "invoiced" | "paid";
  createdAt: string;
};

const SMS_COST_EUR = 0.05;
const SMS_RETAIL_EUR = 0.15;
const VOICE_COST_EUR = 0.02;
const VOICE_RETAIL_EUR = 0.06;

export class SaasTwilioRebillingService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async rollupPeriod(agencyTenantId: string, period: string): Promise<TwilioRebillingEntry[]> {
    const subs = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_subcuentas WHERE agency_tenant_id = $1 AND status = 'active'`,
      [agencyTenantId],
    );
    const results: TwilioRebillingEntry[] = [];
    for (const sub of subs) {
      const meter = await this.db.query<{ sms: string; wf: string }>(
        `SELECT COALESCE(SUM(sms_sent),0)::text AS sms, COALESCE(SUM(workflow_runs),0)::text AS wf
         FROM saas_subcuenta_meter_daily
         WHERE subcuenta_id = $1::uuid AND to_char(meter_date, 'YYYY-MM') = $2`,
        [sub.id, period],
      );
      const smsCount = Number(meter[0]?.sms ?? 0);
      const voiceMinutes = Number(meter[0]?.wf ?? 0) * 0.5;
      if (smsCount === 0 && voiceMinutes === 0) continue;
      const costEur = smsCount * SMS_COST_EUR + voiceMinutes * VOICE_COST_EUR;
      const retailEur = smsCount * SMS_RETAIL_EUR + voiceMinutes * VOICE_RETAIL_EUR;
      const rows = await this.db.query<Record<string, unknown>>(
        `INSERT INTO saas_twilio_rebilling_ledger
           (agency_tenant_id, subcuenta_id, period, sms_count, voice_minutes, cost_eur, retail_eur)
         VALUES ($1, $2::uuid, $3, $4, $5, $6, $7)
         ON CONFLICT (agency_tenant_id, subcuenta_id, period) DO UPDATE SET
           sms_count = EXCLUDED.sms_count,
           voice_minutes = EXCLUDED.voice_minutes,
           cost_eur = EXCLUDED.cost_eur,
           retail_eur = EXCLUDED.retail_eur
         RETURNING *`,
        [agencyTenantId, sub.id, period, smsCount, voiceMinutes, costEur, retailEur],
      );
      if (rows[0]) results.push(this.mapRow(rows[0]));
    }
    return results;
  }

  async list(agencyTenantId: string, limit = 50): Promise<TwilioRebillingEntry[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_twilio_rebilling_ledger
       WHERE agency_tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [agencyTenantId, limit],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async getSummary(agencyTenantId: string): Promise<{ pendingRetail: number; totalSms: number }> {
    const rows = await this.db.query<{ r: string; s: string }>(
      `SELECT COALESCE(SUM(retail_eur) FILTER (WHERE status='pending'),0)::text AS r,
              COALESCE(SUM(sms_count),0)::text AS s
       FROM saas_twilio_rebilling_ledger WHERE agency_tenant_id = $1`,
      [agencyTenantId],
    );
    return {
      pendingRetail: Number(rows[0]?.r ?? 0),
      totalSms: Number(rows[0]?.s ?? 0),
    };
  }

  private mapRow(r: Record<string, unknown>): TwilioRebillingEntry {
    return {
      id: String(r.id),
      agencyTenantId: String(r.agency_tenant_id),
      subcuentaId: String(r.subcuenta_id),
      period: String(r.period),
      smsCount: Number(r.sms_count),
      voiceMinutes: Number(r.voice_minutes),
      costEur: Number(r.cost_eur),
      retailEur: Number(r.retail_eur),
      status: String(r.status) as TwilioRebillingEntry["status"],
      createdAt: String(r.created_at),
    };
  }
}

let _svc: SaasTwilioRebillingService | undefined;
export function getSaasTwilioRebillingService(): SaasTwilioRebillingService {
  _svc ??= new SaasTwilioRebillingService();
  return _svc;
}
export function resetSaasTwilioRebillingServiceForTests(): void {
  _svc = undefined;
}
