/**
 * Unified partner program facade — aggregates three stacks without auto-payout.
 * Commissions may be calculated; money movement requires NELVYON_CEO_PARTNER_PAYOUTS=1.
 */
import { getSaasAffiliateService } from "../saas/SaasAffiliateService";
import { getSaasPartnerZoneService } from "../saas/SaasPartnerZoneService";
import {
  assertCeoPartnerPayoutAuthorized,
  isCeoPartnerPayoutEnabled,
} from "./ceoPartnerPayoutGate";

export type PartnerStackId = "partner_zone" | "tenant_affiliates" | "platform_affiliates";

export type PartnerProgramSnapshot = {
  stacks: Array<{
    id: PartnerStackId;
    title: string;
    dashboardPath: string;
    payoutsEnabled: boolean;
    notes: string;
  }>;
  ceoPayoutGate: {
    envFlag: "NELVYON_CEO_PARTNER_PAYOUTS";
    enabled: boolean;
    rule: string;
  };
  tenantId: string;
  tenantAffiliateSummary?: unknown;
  partnerZoneSummary?: unknown;
};

export { assertCeoPartnerPayoutAuthorized, isCeoPartnerPayoutEnabled };

export async function getPartnerProgramSnapshot(
  tenantId: string,
  userId?: string,
): Promise<PartnerProgramSnapshot> {
  const affiliateSvc = getSaasAffiliateService();
  let tenantAffiliateSummary: unknown;
  let partnerZoneSummary: unknown;
  try {
    tenantAffiliateSummary = await affiliateSvc.getPayoutSummary(tenantId);
  } catch {
    tenantAffiliateSummary = { error: "unavailable" };
  }
  try {
    partnerZoneSummary = await getSaasPartnerZoneService().getZoneSummary(tenantId, userId);
  } catch {
    partnerZoneSummary = { error: "unavailable" };
  }

  return {
    tenantId,
    stacks: [
      {
        id: "partner_zone",
        title: "Partner Zone",
        dashboardPath: "/saas/partner",
        payoutsEnabled: false,
        notes: "Wholesale/referrals ledger — no auto Stripe pay without CEO gate",
      },
      {
        id: "tenant_affiliates",
        title: "Tenant Affiliates",
        dashboardPath: "/saas/affiliates",
        payoutsEnabled: isCeoPartnerPayoutEnabled(),
        notes: "Commissions calculated; mark-paid / Stripe Connect gated by NELVYON_CEO_PARTNER_PAYOUTS",
      },
      {
        id: "platform_affiliates",
        title: "Platform Affiliates",
        dashboardPath: "/saas/affiliates",
        payoutsEnabled: false,
        notes: "Tracking + pending_payout calc only — no pay API",
      },
    ],
    ceoPayoutGate: {
      envFlag: "NELVYON_CEO_PARTNER_PAYOUTS",
      enabled: isCeoPartnerPayoutEnabled(),
      rule: "Commissions may be calculated and approved as pending/approved; money movement requires CEO flag.",
    },
    tenantAffiliateSummary,
    partnerZoneSummary,
  };
}
