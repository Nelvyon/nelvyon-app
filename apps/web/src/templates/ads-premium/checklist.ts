/**
 * OS delivery QA aligned with backend/ops/runbooks/ads_premium_nelvyon_v1.md
 * plus campaign audit UI expectations.
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type AdsPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface AdsPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: AdsPremiumDeliveryStatus;
}

export const ADS_PREMIUM_DELIVERY_ITEMS: readonly AdsPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path fully green before RELEASE (`pnpm gate`).",
  },
  {
    id: "rb-stability",
    source: "runbook",
    area: "STABILITY",
    status: "ok",
    description: "Post-deploy observability reviewed on `/os/observability` for error/latency regressions.",
  },
  {
    id: "rb-governance",
    source: "runbook",
    area: "GOVERNANCE",
    status: "ok",
    description: "Branding/policy alignment via `/app/branding/policy` when creatives land on tenant-branded surfaces.",
  },
  {
    id: "rb-blast",
    source: "runbook",
    area: "BLAST RADIUS",
    status: "warn",
    description: "Consult `/os/global/risk-queue` when tagging might affect multiple workspaces.",
  },
  {
    id: "rb-trace",
    source: "runbook",
    area: "TRACEABILITY",
    status: "ok",
    description: "Incidents drilldown on `/os/observability/incidents` favors request_id correlation for API-impacting changes.",
  },
  {
    id: "rb-i18n",
    source: "runbook",
    area: "Locales / copy debt",
    status: "warn",
    description: "Optional weekly skim of `/os/i18n` when landing copy ties to campaigns.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Ads Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Campaign modules",
    status: "ok",
    description:
      "Tracking, creatives, copy, segmentation, budget & bidding, optimization, reporting sections visible with status + P1–P3.",
  },
  {
    id: "tmpl-channels",
    source: "template",
    area: "Channels matrix",
    status: "ok",
    description: "Google Ads / Meta Ads / otros shown as scope labels — no OAuth or Ads APIs attached.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildAdsPremiumMetadata` supplies configurable OG/Twitter defaults for this preview route.",
  },
  {
    id: "tmpl-scope",
    source: "template",
    area: "No vendor APIs",
    status: "ok",
    description: "Template does not call Google Ads, Meta Marketing API, or pixels — governance checklist only.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "Verify `/os/ads-premium/preview` at mobile / tablet / desktop with clean console.",
  },
] as const;
