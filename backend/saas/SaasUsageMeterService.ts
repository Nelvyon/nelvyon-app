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
