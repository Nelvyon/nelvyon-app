/**
 * OS delivery QA aligned with backend/ops/runbooks/personal_digital_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type PersonalDigitalPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface PersonalDigitalPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: PersonalDigitalPremiumDeliveryStatus;
}

export const PERSONAL_DIGITAL_PREMIUM_DELIVERY_ITEMS: readonly PersonalDigitalPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path green before declaring personal digital engagement READY (`pnpm gate` where applicable).",
  },
  {
    id: "rb-profile",
    source: "runbook",
    area: "PROFILE & PRESENCE",
    status: "ok",
    description: "`/app/branding` and `/app/branding/preview-v2` reviewed — promised scope matches product truth.",
  },
  {
    id: "rb-web",
    source: "runbook",
    area: "WEB PERSONAL",
    status: "ok",
    description: "Site slice reconciled with `/os/web-premium/preview` or honest external hosting notes — no phantom deploy.",
  },
  {
    id: "rb-networks",
    source: "runbook",
    area: "NETWORKS",
    status: "warn",
    description: "LinkedIn/social claims limited to documented operator work — no unsanctioned OAuth or scrapers.",
  },
  {
    id: "rb-reputation",
    source: "runbook",
    area: "CONTENT & REPUTATION",
    status: "warn",
    description: "Visibility/evidence backs every claim; `/help` path when scope exceeds workspace product.",
  },
  {
    id: "rb-metrics",
    source: "runbook",
    area: "METRICS",
    status: "ok",
    description: "Reporting limited to agreed KPIs — template states expectations only.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Personal Digital Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Profile/presence, personal web, professional networks, content, reputation/visibility, reporting — P1–P3 + statuses only.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildPersonalDigitalPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external personal APIs",
    status: "ok",
    description: "No new social scraping, OAuth, or reputation SaaS integrations from this OS template.",
  },
  {
    id: "tmpl-v1",
    source: "template",
    area: "PERSONAL DIGITAL v1 boundary",
    status: "ok",
    description: "Does not modify closed PERSONAL DIGITAL v1 infra — consumes existing routes as links.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "`/os/personal-digital-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
