import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { getSaasPlanLimits, SaasPlanQuotaError } from "./saasPlanLimits";

export type UsageSnapshot = {
  date: string;
  contactsCreated: number;
  emailsSent: number;
  workflowRuns: number;
  apiCalls: number;
  smsSent: number;
  limits: ReturnType<typeof getSaasPlanLimits>;
};

export class SaasUsageMeterService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async increment(tenantId: string, field: "contactsCreated" | "emailsSent" | "workflowRuns" | "apiCalls" | "smsSent", amount = 1): Promise<void> {
    const colMap = {
      contactsCreated: "contacts_created",
      emailsSent: "emails_sent",
      workflowRuns: "workflow_runs",
      apiCalls: "api_calls",
      smsSent: "sms_sent",
    } as const;
    const col = colMap[field];
    await this.db.query(
      `INSERT INTO saas_usage_meter_daily (tenant_id, meter_date, ${col})
       VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (tenant_id, meter_date) DO UPDATE SET ${col} = saas_usage_meter_daily.${col} + $2`,
      [tenantId, amount],
    );
    if (process.env.STRIPE_METER_LIVE === "1") {
      const meterKey = field === "emailsSent" ? "email" : field === "smsSent" ? "sms" : field === "apiCalls" ? "api_calls" : null;
      if (meterKey) {
        void import("./SaasStripeMeterService").then(({ getSaasStripeMeterService }) =>
          getSaasStripeMeterService().reportUsage(tenantId, meterKey, amount),
        );
      }
    }
  }

  /** Tenant meter + subcuenta mirror when tenant_id maps to an active subcuenta. */
  async incrementWithSubcuentaMirror(
    tenantId: string,
    field: "emailsSent" | "workflowRuns" | "apiCalls" | "smsSent",
    amount = 1,
  ): Promise<void> {
    await this.increment(tenantId, field, amount);
    const rows = await this.db.query<{ id: string; agency_tenant_id: string }>(
      `SELECT id, agency_tenant_id FROM saas_subcuentas WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
      [tenantId],
    );
    const sub = rows[0];
    if (sub) {
      await this.incrementSubcuenta(sub.id, sub.agency_tenant_id, field, amount);
    }
  }

  async incrementSubcuenta(
    subcuentaId: string,
    agencyTenantId: string,
    field: "emailsSent" | "workflowRuns" | "apiCalls" | "smsSent",
    amount = 1,
  ): Promise<void> {
    const colMap = {
      emailsSent: "emails_sent",
      workflowRuns: "workflow_runs",
      apiCalls: "api_calls",
      smsSent: "sms_sent",
    } as const;
    const col = colMap[field];
    await this.db.query(
      `INSERT INTO saas_subcuenta_meter_daily (subcuenta_id, agency_tenant_id, meter_date, ${col})
       VALUES ($1::uuid, $2, CURRENT_DATE, $3)
       ON CONFLICT (subcuenta_id, meter_date) DO UPDATE SET ${col} = saas_subcuenta_meter_daily.${col} + $3`,
      [subcuentaId, agencyTenantId, amount],
    ).catch(() => {});
  }

  async getSubcuentaMonthMeter(subcuentaId: string): Promise<{
    emailsSent: number;
    smsSent: number;
    apiCalls: number;
    workflowRuns: number;
  }> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT COALESCE(SUM(emails_sent),0) AS emails_sent,
              COALESCE(SUM(sms_sent),0) AS sms_sent,
              COALESCE(SUM(api_calls),0) AS api_calls,
              COALESCE(SUM(workflow_runs),0) AS workflow_runs
       FROM saas_subcuenta_meter_daily
       WHERE subcuenta_id = $1::uuid
         AND meter_date >= date_trunc('month', CURRENT_DATE)::date`,
      [subcuentaId],
    );
    const r = rows[0];
    return {
      emailsSent: Number(r?.emails_sent ?? 0),
      smsSent: Number(r?.sms_sent ?? 0),
      apiCalls: Number(r?.api_calls ?? 0),
      workflowRuns: Number(r?.workflow_runs ?? 0),
    };
  }

  async getToday(tenantId: string, plan: import("./SaasOnboardingService").SaasPlan): Promise<UsageSnapshot> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT contacts_created, emails_sent, workflow_runs, api_calls, sms_sent, meter_date
       FROM saas_usage_meter_daily WHERE tenant_id=$1 AND meter_date=CURRENT_DATE`,
      [tenantId],
    );
    const r = rows[0];
    return {
      date: String(r?.meter_date ?? new Date().toISOString().slice(0, 10)),
      contactsCreated: Number(r?.contacts_created ?? 0),
      emailsSent: Number(r?.emails_sent ?? 0),
      workflowRuns: Number(r?.workflow_runs ?? 0),
      apiCalls: Number(r?.api_calls ?? 0),
      smsSent: Number(r?.sms_sent ?? 0),
      limits: getSaasPlanLimits(plan),
    };
  }

  assertWithinLimit(plan: import("./SaasOnboardingService").SaasPlan, resource: import("./saasPlanLimits").SaasPlanResource, current: number): void {
    const limit = getSaasPlanLimits(plan)[resource];
    if (limit !== null && current >= limit) {
      throw new SaasPlanQuotaError(
        `Plan limit reached for ${resource}`,
        resource,
        limit,
        current,
      );
    }
  }
}

let _svc: SaasUsageMeterService | undefined;
export function getSaasUsageMeterService(): SaasUsageMeterService {
  if (!_svc) _svc = new SaasUsageMeterService();
  return _svc;
}
