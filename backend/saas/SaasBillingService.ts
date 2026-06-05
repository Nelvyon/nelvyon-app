import type { SaasTenant } from "./SaasOnboardingService";
import { getSaasPlanLimits, type SaasPlanLimits } from "./saasPlanLimits";
import { getSaasPlanQuotaService } from "./SaasPlanQuotaService";
import { listPermissionsForRole, type SaasRole } from "./saasRbac";

export type SaasUsageCounts = {
  contacts: number;
  deals: number;
  campanias: number;
  workflows: number;
  users: number;
};

export type SaasBillingSummary = {
  tenant: Pick<SaasTenant, "id" | "companyName" | "plan" | "onboardingCompleted">;
  role: SaasRole;
  permissions: ReturnType<typeof listPermissionsForRole>;
  limits: SaasPlanLimits;
  usage: SaasUsageCounts;
};

export async function buildSaasBillingSummary(tenant: SaasTenant, role: SaasRole): Promise<SaasBillingSummary> {
  const snapshot = await getSaasPlanQuotaService().getUsageSnapshot(tenant.id);

  return {
    tenant: {
      id: tenant.id,
      companyName: tenant.companyName,
      plan: tenant.plan,
      onboardingCompleted: tenant.onboardingCompleted,
    },
    role,
    permissions: listPermissionsForRole(role),
    limits: snapshot.limits,
    usage: snapshot.usage,
  };
}

export type SaasSettingsSummary = {
  tenant: SaasTenant;
  role: SaasRole;
  permissions: ReturnType<typeof listPermissionsForRole>;
};

export function buildSaasSettingsSummary(tenant: SaasTenant, role: SaasRole): SaasSettingsSummary {
  return {
    tenant,
    role,
    permissions: listPermissionsForRole(role),
  };
}
