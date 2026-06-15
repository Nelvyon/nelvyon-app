export const BILLABLE_PLANS = ["starter", "pro", "agency", "agency_partner"] as const;
export type BillablePlan = (typeof BILLABLE_PLANS)[number];

export const PLAN_NAMES: Record<BillablePlan, string> = {
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
  agency_partner: "Agency Partner",
};

/** Precios públicos (EUR/mes). agency_partner = wholesale que paga el partner a Nelvyon. */
export const PLAN_PRICES: Record<BillablePlan, number> = {
  starter: 47,
  pro: 197,
  agency: 497,
  agency_partner: 197,
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

/**
 * Stripe Price ID (mensual) para checkout y cambio de plan.
 * Preferencia: STRIPE_PRICE_ID_*; compatibilidad STRIPE_PRICE_{PLAN}_MONTHLY.
 */
export function getStripePriceId(plan: BillablePlan, billingCycle = "monthly"): string {
  const cycleKey = billingCycle.toUpperCase();
  const planKey = plan.toUpperCase();
  const fromEnv =
    plan === "starter"
      ? process.env.STRIPE_PRICE_ID_STARTER ??
        process.env[`STRIPE_PRICE_${planKey}_${cycleKey}`] ??
        process.env.STRIPE_PRICE_STARTER_MONTHLY
      : plan === "pro"
        ? process.env.STRIPE_PRICE_ID_PRO ??
          process.env[`STRIPE_PRICE_${planKey}_${cycleKey}`] ??
          process.env.STRIPE_PRICE_PRO_MONTHLY
        : plan === "agency_partner"
          ? process.env.STRIPE_PRICE_ID_AGENCY_PARTNER ??
            process.env[`STRIPE_PRICE_${planKey}_${cycleKey}`] ??
            process.env.STRIPE_PRICE_AGENCY_PARTNER_MONTHLY
          : process.env.STRIPE_PRICE_ID_AGENCY ??
            process.env[`STRIPE_PRICE_${planKey}_${cycleKey}`] ??
            process.env.STRIPE_PRICE_AGENCY_MONTHLY;
  const id = fromEnv?.trim();
  if (!id) {
    throw new Error(`Stripe price ID no configurado para el plan: ${plan}`);
  }
  return id;
}

/** @deprecated Use getStripePriceId — Paddle removed (MIG 308). */
export function getPaddlePriceId(plan: BillablePlan): string {
  return getStripePriceId(plan);
}
