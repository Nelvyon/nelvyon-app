/**
 * OS delivery QA aligned with backend/ops/runbooks/influencer_marketing_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type InfluencerPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface InfluencerPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: InfluencerPremiumDeliveryStatus;
}

export const INFLUENCER_PREMIUM_DELIVERY_ITEMS: readonly InfluencerPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when influencer-related surfaces ship in the same release train.",
  },
  {
    id: "rb-strategy",
    source: "runbook",
    area: "STRATEGY & OBJECTIVES",
    status: "ok",
    description: "KPIs and brand safety — types: nano, micro, macro, mega, brand_ambassador, ugc_creator, celebrity, b2b_thought_leader.",
  },
  {
    id: "rb-search",
    source: "runbook",
    area: "SEARCH & SELECTION",
    status: "warn",
    description: "Vetting and fraud signals — no marketplace API hooks from OS template.",
  },
  {
    id: "rb-brief",
    source: "runbook",
    area: "BRIEFING & CONTRACT",
    status: "ok",
    description: "Rights and disclosure — `/os/contenido-copywriting-premium/preview` when scripts and #ad copy overlap.",
  },
  {
    id: "rb-prod",
    source: "runbook",
    area: "CONTENT PRODUCTION",
    status: "ok",
    description: "Shot lists and approvals — no raw asset CDN from checklist.",
  },
  {
    id: "rb-publish",
    source: "runbook",
    area: "PUBLICATION & TRACKING",
    status: "ok",
    description: "Windows and UTMs — `/os/social-media-premium/preview` for calendar posture.",
  },
  {
    id: "rb-metrics",
    source: "runbook",
    area: "METRICS & ROI",
    status: "warn",
    description: "EMV/CPA definitions — `/os/ads-premium/preview` when paid boosting overlaps.",
  },
  {
    id: "rb-report",
    source: "runbook",
    area: "FINAL REPORTING",
    status: "ok",
    description: "Learnings and caveats — no platform analytics API from OS preview.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Influencer Marketing Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Strategy, search/selection, briefing/contract, production, publication, metrics/ROI, final reporting — P1–P3 + type badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildInfluencerPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-marketplace",
    source: "template",
    area: "No influencer platforms",
    status: "ok",
    description: "No GRIN/Aspire/Upfluence or similar connectors from this OS template.",
  },
  {
    id: "tmpl-no-contracts",
    source: "template",
    area: "No real contracts",
    status: "ok",
    description: "Does not generate or e-sign binding talent agreements from this page.",
  },
  {
    id: "tmpl-boundary",
    source: "template",
    area: "Closed fronts",
    status: "ok",
    description: "Does not modify closed product fronts or `/crm/deals`.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "`/os/influencer-marketing-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
