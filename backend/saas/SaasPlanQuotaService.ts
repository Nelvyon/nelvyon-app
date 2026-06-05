import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getSaasPlanLimits, type SaasPlanLimits } from "./saasPlanLimits";
import { getSaasResourceUsage, getSaasTenantPlan } from "./saasPlanQuota";
import type { SaasPlanResource } from "./saasPlanLimits";

export class SaasPlanQuotaService {
  constructor(private readonly db: SaasPostgresPort) {}

  async getTenantPlan(tenantId: string) {
    return getSaasTenantPlan(this.db, tenantId);
  }

  async countResource(tenantId: string, resource: SaasPlanResource): Promise<number> {
    return getSaasResourceUsage(this.db, tenantId, resource);
  }

  async getUsageSnapshot(tenantId: string): Promise<{ plan: Awaited<ReturnType<typeof getSaasTenantPlan>>; limits: SaasPlanLimits; usage: Record<SaasPlanResource, number> }> {
    const plan = await getSaasTenantPlan(this.db, tenantId);
    const limits = getSaasPlanLimits(plan);
    const [contacts, deals, campanias, workflows, users] = await Promise.all([
      this.countResource(tenantId, "contacts"),
      this.countResource(tenantId, "deals"),
      this.countResource(tenantId, "campanias"),
      this.countResource(tenantId, "workflows"),
      this.countResource(tenantId, "users"),
    ]);
    return { plan, limits, usage: { contacts, deals, campanias, workflows, users } };
  }
}

let singleton: SaasPlanQuotaService | null = null;

export function getSaasPlanQuotaService(): SaasPlanQuotaService {
  if (!singleton) {
    singleton = new SaasPlanQuotaService(DbClient.getInstance());
  }
  return singleton;
}

export function resetSaasPlanQuotaServiceForTests(): void {
  singleton = null;
}
