export type SaasPlan = "starter" | "pro" | "enterprise";

export class SaasPlanValidationError extends Error {
  constructor() {
    super("Invalid SaaS plan");
    this.name = "SaasPlanValidationError";
  }
}

export function assertSaasPlan(value: string): SaasPlan {
  if (value === "starter" || value === "pro" || value === "enterprise") {
    return value;
  }
  throw new SaasPlanValidationError();
}

/** plan_id from Python subscriptions / Stripe metadata (not yet a saas_tenants.plan). */
export type BillablePlanId = string;

const SYNCABLE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export function normalizeBillablePlanId(raw: string | null | undefined): string {
  return String(raw ?? "").trim().toLowerCase();
}

/**
 * Maps billing plan_id (Python SSOT / Stripe) to saas_tenants.plan CHECK constraint.
 * agency → enterprise; partner → starter; unknown → starter.
 */
export function mapBillablePlanToSaasPlan(billablePlanId: string): SaasPlan {
  switch (normalizeBillablePlanId(billablePlanId)) {
    case "starter":
      return "starter";
    case "pro":
      return "pro";
    case "enterprise":
      return "enterprise";
    case "agency":
      return "enterprise";
    case "partner":
      return "starter";
    default:
      return "starter";
  }
}

/** Subscription statuses that warrant syncing plan into saas_tenants (pre-gate). */
export function isSaasPlanSyncStatus(status: string): boolean {
  return SYNCABLE_SUBSCRIPTION_STATUSES.has(normalizeBillablePlanId(status));
}

/** Whether a subscription row should drive an UPDATE to saas_tenants.plan. */
export function shouldSyncSaasTenantPlan(status: string): boolean {
  return isSaasPlanSyncStatus(status);
}

export type SaasTenantRow = {
  id: string;
  user_id: string;
  workspace_id: number | null;
  company_name: string;
  industry: string;
  plan: string;
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[] | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export const SAAS_TENANT_SELECT =
  "id, user_id, workspace_id, company_name, industry, plan, website, phone, employees, goals, onboarding_completed, onboarding_step, created_at, updated_at";

export type SaasTenantMapped = {
  id: string;
  userId: string;
  workspaceId: number | null;
  companyName: string;
  industry: string;
  plan: SaasPlan;
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[];
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
};

export function saasTenantFromRow(r: SaasTenantRow): SaasTenantMapped {
  return {
    id: r.id,
    userId: r.user_id,
    workspaceId: r.workspace_id ?? null,
    companyName: r.company_name,
    industry: r.industry,
    plan: assertSaasPlan(r.plan),
    website: r.website,
    phone: r.phone,
    employees: r.employees,
    goals: r.goals ?? [],
    onboardingCompleted: r.onboarding_completed,
    onboardingStep: r.onboarding_step,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
  };
}
