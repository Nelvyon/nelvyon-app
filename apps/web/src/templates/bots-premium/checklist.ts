/**
 * OS delivery QA aligned with backend/ops/runbooks/bots_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type BotsPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface BotsPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: BotsPremiumDeliveryStatus;
}

export const BOTS_PREMIUM_DELIVERY_ITEMS: readonly BotsPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path green before declaring bots engagement READY (`pnpm gate`).",
  },
  {
    id: "rb-product",
    source: "runbook",
    area: "PRODUCT ALIGNMENT",
    status: "ok",
    description: "`/app/assistant` reviewed — scope matches what was sold (no phantom features).",
  },
  {
    id: "rb-integrations",
    source: "runbook",
    area: "INTEGRATIONS",
    status: "warn",
    description: "Only governed hooks referenced; `/automations/*` consulted when integrations are claimed.",
  },
  {
    id: "rb-handoff",
    source: "runbook",
    area: "HANDOFF",
    status: "ok",
    description: "Human path explicit when automation stops (`/help`, inbox/support conventions).",
  },
  {
    id: "rb-metrics",
    source: "runbook",
    area: "METRICS",
    status: "warn",
    description: "Reporting limited to truthful signals — relevant tests/smoke remain green when bots codepaths change.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Bots Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Bot config, channel/deploy, conversational flow, integrations, handoff/escalation, reporting — P1–P3 + statuses only.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildBotsPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external bot APIs",
    status: "ok",
    description: "No new LLM/bot SaaS integrations from this OS template.",
  },
  {
    id: "tmpl-v1",
    source: "template",
    area: "BOTS v1 boundary",
    status: "ok",
    description: "Does not modify bots v1 infrastructure — consumes existing routes as links.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "`/os/bots-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
