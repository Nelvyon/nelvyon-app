export const BILLABLE_PLANS = ["starter", "pro", "agency", "agency_partner"] as const;
export type BillablePlan = (typeof BILLABLE_PLANS)[number];

/** Planes SaaS con checkout directo vía STRIPE_PRICE_ID_* */
export const CHECKOUT_STRIPE_PLANS = ["starter", "pro", "agency"] as const;
export type CheckoutStripePlan = (typeof CHECKOUT_STRIPE_PLANS)[number];

export const STRIPE_PRICE_ENV_BY_PLAN: Record<BillablePlan, string> = {
  starter: "STRIPE_PRICE_ID_STARTER",
  pro: "STRIPE_PRICE_ID_PRO",
  agency: "STRIPE_PRICE_ID_AGENCY",
  agency_partner: "STRIPE_PRICE_ID_AGENCY_PARTNER",
};

export const PLAN_NAMES: Record<BillablePlan, string> = {
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
  agency_partner: "Agency Partner",
};

/** Precios públicos (EUR/mes). agency_partner = wholesale que paga el partner a Nelvyon. */
export const PLAN_PRICES: Record<BillablePlan, number> = {
  starter: 97,
  pro: 297,
  agency: 797,
  agency_partner: 297,
};

export const PLAN_LIMITS: Record<
  BillablePlan,
  {
    agentCalls: number;
    sectors: number;
  }
> = {
  starter: { agentCalls: 100, sectors: 3 },
  pro: { agentCalls: 500, sectors: 10 },
  agency: { agentCalls: 2000, sectors: 999 },
  agency_partner: { agentCalls: 2000, sectors: 999 },
};

const PLAN_ORDER: Record<BillablePlan, number> = {
  starter: 0,
  pro: 1,
  agency: 2,
  agency_partner: 3,
};

export function planTier(plan: BillablePlan): number {
  return PLAN_ORDER[plan];
}

export function comparePlans(a: BillablePlan, b: BillablePlan): number {
  return planTier(a) - planTier(b);
}

export function normalizeBillablePlan(raw: string): BillablePlan | null {
  const p = raw.toLowerCase().trim();
  return BILLABLE_PLANS.includes(p as BillablePlan) ? (p as BillablePlan) : null;
}

export function getStripePriceEnvVarName(plan: BillablePlan): string {
  return STRIPE_PRICE_ENV_BY_PLAN[plan];
}

/**
 * Stripe Price ID (mensual) — únicamente desde STRIPE_PRICE_ID_* en Railway.
 * No hay fallbacks ni IDs hardcodeados.
 */
export function getStripePriceId(plan: BillablePlan): string {
  const envVar = getStripePriceEnvVarName(plan);
  const id = process.env[envVar]?.trim();
  if (!id) {
    throw new Error(`Falta variable de entorno: ${envVar}`);
  }
  return id;
}

/** @deprecated Use getStripePriceId — Paddle removed (MIG 308). */
export function getPaddlePriceId(plan: BillablePlan): string {
  return getStripePriceId(plan);
}
