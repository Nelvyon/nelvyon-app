/**
 * OS delivery QA aligned with backend/ops/runbooks/seo_premium_nelvyon_v1.md
 * plus template-specific verification (audit UI, metadata helper).
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type SEOPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface SEOPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: SEOPremiumDeliveryStatus;
}

export const SEO_PREMIUM_DELIVERY_ITEMS: readonly SEOPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY gate",
    status: "ok",
    description: "Golden path green before RELEASE (`pnpm gate`, typecheck, lint).",
  },
  {
    id: "rb-i18n",
    source: "runbook",
    area: "Locales",
    status: "ok",
    description: "Consult `/os/i18n` when shipping multi-locale-facing or indexable changes.",
  },
  {
    id: "rb-policy",
    source: "runbook",
    area: "Policy",
    status: "ok",
    description: "Tenant branding respects `/app/branding/policy` when identity affects public assets.",
  },
  {
    id: "rb-observability",
    source: "runbook",
    area: "Observability",
    status: "warn",
    description: "If SEO deploys correlate with errors, use `/os/observability` and incidents drilldown.",
  },
  {
    id: "rb-debt",
    source: "runbook",
    area: "Debt tracking",
    status: "warn",
    description: "Prioritize P1 hotspots on `/os/i18n` before major indexable pushes.",
  },
  {
    id: "rb-honest",
    source: "runbook",
    area: "Honest labeling",
    status: "ok",
    description: "Internal-only surfaces not positioned as SEO-complete without external crawl validation.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "SEO Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Audit modules",
    status: "ok",
    description: "Technical, on-page, content, interlinking, CWV, and reporting sections render with statuses and evidence.",
  },
  {
    id: "tmpl-meta-helper",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildSEOPremiumMetadata` documents configurable title/description/OG for this preview route.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "Scope discipline",
    status: "ok",
    description: "No external SERP/crawler APIs wired — checklist items are configuration + manual evidence only.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "Verify mobile / tablet / desktop layout and console cleanliness on `/os/seo-premium/preview`.",
  },
] as const;
