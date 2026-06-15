/** Wholesale pricing SSOT — Agency Partner (P1, sin rebilling Stripe Connect). */

export const AGENCY_PARTNER_PLAN_ID = "agency_partner" as const;

export type WholesaleClientPlanId = "starter" | "pro";

export type WholesalePackId =
  | "local-business-growth"
  | "ecommerce-growth"
  | "saas-b2b-growth";

export type WholesaleClientPlan = {
  id: WholesaleClientPlanId;
  label: string;
  retailEur: number;
  wholesaleEur: number;
};

export type WholesalePack = {
  id: WholesalePackId;
  label: string;
  wholesaleEur: number;
  suggestedRetailEur: number;
};

export const AGENCY_PARTNER_SUBSCRIPTION = {
  planId: AGENCY_PARTNER_PLAN_ID,
  label: "Agency Partner",
  wholesaleEur: 197,
  includedClientSlots: 10,
  extraClientSlotWholesaleEur: 29,
} as const;

export const WHOLESALE_CLIENT_PLANS: readonly WholesaleClientPlan[] = [
  { id: "starter", label: "Starter cliente", retailEur: 79, wholesaleEur: 39 },
  { id: "pro", label: "Pro cliente", retailEur: 249, wholesaleEur: 129 },
];

export const WHOLESALE_GROWTH_PACKS: readonly WholesalePack[] = [
  {
    id: "local-business-growth",
    label: "Local Growth Pack",
    wholesaleEur: 149,
    suggestedRetailEur: 497,
  },
  {
    id: "ecommerce-growth",
    label: "Ecommerce Growth Pack",
    wholesaleEur: 199,
    suggestedRetailEur: 697,
  },
  {
    id: "saas-b2b-growth",
    label: "SaaS B2B Growth Pack",
    wholesaleEur: 249,
    suggestedRetailEur: 897,
  },
];

export function clientPlanMarginEur(planId: WholesaleClientPlanId): number {
  const plan = WHOLESALE_CLIENT_PLANS.find((p) => p.id === planId);
  if (!plan) return 0;
  return plan.retailEur - plan.wholesaleEur;
}

export function packMarginEur(packId: string): number {
  const pack = WHOLESALE_GROWTH_PACKS.find((p) => p.id === packId);
  if (!pack) return 0;
  return pack.suggestedRetailEur - pack.wholesaleEur;
}

export function isAgencyPartnerPlan(planId: string | undefined | null): boolean {
  const p = (planId ?? "").toLowerCase();
  return p === AGENCY_PARTNER_PLAN_ID || p === "partner" || p === "agency";
}

export function buildWholesaleCatalogPayload() {
  return {
    subscription: AGENCY_PARTNER_SUBSCRIPTION,
    client_plans: WHOLESALE_CLIENT_PLANS.map((p) => ({
      ...p,
      margin_eur: clientPlanMarginEur(p.id),
    })),
    growth_packs: WHOLESALE_GROWTH_PACKS.map((p) => ({
      ...p,
      margin_eur: packMarginEur(p.id),
    })),
  };
}
