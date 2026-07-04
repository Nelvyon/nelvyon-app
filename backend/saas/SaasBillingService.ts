import type { SaasTenant } from "./SaasOnboardingService";
import { getSaasPlanLimits, type SaasPlanLimits } from "./saasPlanLimits";
import { getSaasPlanQuotaService } from "./SaasPlanQuotaService";
import { listPermissionsForRole, type SaasRole } from "./saasRbac";
import { isStripeEnvConfigured } from "./saasEnv";

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
  stripeConfigured: boolean;
  billingNote: string;
};

export async function buildSaasBillingSummary(tenant: SaasTenant, role: SaasRole): Promise<SaasBillingSummary> {
  const snapshot = await getSaasPlanQuotaService().getUsageSnapshot(tenant.id);
  const stripeConfigured = isStripeEnvConfigured();

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
    stripeConfigured,
    billingNote: stripeConfigured
      ? "El plan se activa vía webhook Stripe (no solo por la URL de éxito)."
      : "Stripe no configurado en el servidor. Contacta soporte para activar checkout.",
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
