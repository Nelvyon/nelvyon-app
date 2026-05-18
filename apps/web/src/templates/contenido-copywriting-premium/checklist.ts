/**
 * OS delivery QA aligned with backend/ops/runbooks/contenido_copywriting_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type ContenidoPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface ContenidoPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: ContenidoPremiumDeliveryStatus;
}

export const CONTENIDO_PREMIUM_DELIVERY_ITEMS: readonly ContenidoPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when content-related web surfaces ship in the same release train.",
  },
  {
    id: "rb-voice",
    source: "runbook",
    area: "STRATEGY & VOICE",
    status: "ok",
    description: "Pillars, banned phrases, tone matrix — check `/app/branding` when policy applies.",
  },
  {
    id: "rb-calendar",
    source: "runbook",
    area: "EDITORIAL CALENDAR",
    status: "ok",
    description: "Formats explicit per slot: blog, landing, web copy, email copy, ads copy, guión, redes sociales, SEO content.",
  },
  {
    id: "rb-writing",
    source: "runbook",
    area: "WRITING & COPY",
    status: "warn",
    description: "Draft/review/final versioning documented externally — no generative APIs from this template.",
  },
  {
    id: "rb-review",
    source: "runbook",
    area: "REVIEW & QUALITY",
    status: "ok",
    description: "Legal/comms sign-off roles named; `/help` when scope exceeds workspace product.",
  },
  {
    id: "rb-seo",
    source: "runbook",
    area: "SEO ON-PAGE",
    status: "warn",
    description: "Honest scope vs `/os/seo-premium/preview` — no rank guarantees from paperwork.",
  },
  {
    id: "rb-deliverables",
    source: "runbook",
    area: "DELIVERABLES & REPORTING",
    status: "ok",
    description: "Pack list reconciled; metrics claims limited to agreed definitions.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Contenido y Copywriting Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Strategy/voice, editorial calendar, writing/copy, review/quality, SEO on-page, deliverables/reporting — P1–P3 + format badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildContenidoPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No content-gen APIs",
    status: "ok",
    description: "No LLM or third-party copy-gen SaaS wiring from this OS template.",
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
    description: "`/os/contenido-copywriting-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
