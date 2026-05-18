/**
 * OS delivery QA aligned with backend/ops/runbooks/social_media_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type SocialMediaPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface SocialMediaPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: SocialMediaPremiumDeliveryStatus;
}

export const SOCIAL_MEDIA_PREMIUM_DELIVERY_ITEMS: readonly SocialMediaPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when social-related web surfaces ship in the same release train.",
  },
  {
    id: "rb-strategy",
    source: "runbook",
    area: "STRATEGY & CALENDAR",
    status: "ok",
    description: "Pillars, cadence, approvals — Instagram, LinkedIn, TikTok, X/Twitter, Facebook, YouTube scope explicit per row.",
  },
  {
    id: "rb-creative",
    source: "runbook",
    area: "CREATIVE & COPY",
    status: "ok",
    description: "Assets and copy traceable; `/app/branding` consulted when visual policy is in scope.",
  },
  {
    id: "rb-publishing",
    source: "runbook",
    area: "PUBLISHING",
    status: "warn",
    description: "Manual vs automated posting claims honest — no API keys from this template.",
  },
  {
    id: "rb-community",
    source: "runbook",
    area: "COMMUNITY",
    status: "ok",
    description: "Moderation + escalation via `/help` (or agreed human path) when toxicity/legal risk appears.",
  },
  {
    id: "rb-growth",
    source: "runbook",
    area: "GROWTH",
    status: "warn",
    description: "Growth levers documented without promising viral algorithms or paid boost integrations here.",
  },
  {
    id: "rb-metrics",
    source: "runbook",
    area: "METRICS",
    status: "ok",
    description: "Per-platform KPIs with baselines — template records expectations only.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Social Media Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Strategy/calendar, creative/copy, publishing, community, growth/reach, reporting — P1–P3 + platform badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildSocialMediaPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No social APIs",
    status: "ok",
    description: "No Meta/TikTok/X/LinkedIn/YouTube API wiring from this OS template.",
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
    description: "`/os/social-media-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
