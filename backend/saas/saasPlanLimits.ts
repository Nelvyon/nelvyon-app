import type { SaasPlan } from "./SaasOnboardingService";

/** Plan resource keys enforced on Node SaaS APIs. Aligned with backend/core/pricing_plans.py + deals extension. */
export type SaasPlanResource = "contacts" | "deals" | "campanias" | "workflows" | "users";

export type SaasPlanLimits = Record<SaasPlanResource, number | null>;

const PLAN_LIMITS: Record<SaasPlan, SaasPlanLimits> = {
  starter: {
    contacts: 2500,
    deals: 500,
    campanias: 10,
    workflows: 10,
    users: 3,
  },
  pro: {
    contacts: 25000,
    deals: 5000,
    campanias: 200,
    workflows: 100,
    users: 20,
  },
  enterprise: {
    contacts: null,
    deals: null,
    campanias: null,
    workflows: null,
    users: null,
  },
};

export function getSaasPlanLimits(plan: SaasPlan): SaasPlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
}

export function getSaasPlanLimit(plan: SaasPlan, resource: SaasPlanResource): number | null {
  return getSaasPlanLimits(plan)[resource];
}

export class SaasPlanQuotaError extends Error {
  constructor(
    message: string,
    public readonly resource: SaasPlanResource,
    public readonly limit: number,
    public readonly current: number,
  ) {
    super(message);
    this.name = "SaasPlanQuotaError";
  }
}

export function assertBelowPlanLimit(
  plan: SaasPlan,
  resource: SaasPlanResource,
  currentCount: number,
): void {
  const limit = getSaasPlanLimit(plan, resource);
  if (limit === null) return;
  if (currentCount >= limit) {
    throw new SaasPlanQuotaError(
      `Plan limit reached for ${resource} (${currentCount}/${limit}). Upgrade your plan to add more.`,
      resource,
      limit,
      currentCount,
    );
  }
}
