/**
 * OS delivery QA aligned with backend/ops/runbooks/ecommerce_premium_nelvyon_v1.md
 * plus storefront template expectations (conversion UI, images, meta, CWV notes).
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type EcommercePremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface EcommercePremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: EcommercePremiumDeliveryStatus;
}

export const ECOMMERCE_PREMIUM_DELIVERY_ITEMS: readonly EcommercePremiumDeliveryItem[] = [
  {
    id: "rb-release",
    source: "runbook",
    area: "RELEASE",
    status: "ok",
    description: "Golden path fully green prior to READY (`pnpm gate`, lint, typecheck).",
  },
  {
    id: "rb-incident",
    source: "runbook",
    area: "INCIDENT RESPONSE",
    status: "warn",
    description:
      "When commerce APIs degrade in real deployments: use `/os/observability/incidents` and summarize root cause internally.",
  },
  {
    id: "rb-risk",
    source: "runbook",
    area: "RISK VISIBILITY",
    status: "warn",
    description:
      "High-impact releases: skim `/os/global/risk-queue` when cross-workspace blast radius is plausible.",
  },
  {
    id: "rb-trace",
    source: "runbook",
    area: "CHANGE TRACE",
    status: "pending",
    description: "Meaningful commerce toggles documented in operational handoff / change journal practice.",
  },
  {
    id: "rb-no-shadow",
    source: "runbook",
    area: "NO SHADOW RELEASES",
    status: "ok",
    description: "No bypass of PASA-real discipline for storefront changes.",
  },
  {
    id: "rb-governance",
    source: "runbook",
    area: "Governance literacy",
    status: "ok",
    description: "Policy context: `/app/branding/policy` and `/os/tenants/activation` for tenant-visible programs.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "E‑commerce Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-plp-pdp",
    source: "template",
    area: "Storefront structure",
    status: "ok",
    description: "PLP, PDP, and checkout routes render; internal links between them are valid.",
  },
  {
    id: "tmpl-conversion",
    source: "template",
    area: "Conversion & a11y",
    status: "ok",
    description: "Primary purchase / proceed CTAs visible with ≥44px hit targets and visible focus rings.",
  },
  {
    id: "tmpl-images",
    source: "template",
    area: "Performance (images)",
    status: "warn",
    description:
      "PLP uses lazy images; PDP hero uses priority. Target lab CWV: LCP under 2.5s, CLS under 0.1, responsive input (FID/INP per Lighthouse).",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "SEO / OG per surface",
    status: "ok",
    description: "Catalog and each PDP expose configurable title, description, and Open Graph via metadata builders.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "Verify mobile / tablet / desktop; no console errors on first load per route.",
  },
] as const;
