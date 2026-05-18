/**
 * OS delivery QA aligned with backend/ops/runbooks/canales_comunicaciones_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type CanalesPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface CanalesPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: CanalesPremiumDeliveryStatus;
}

export const CANALES_PREMIUM_DELIVERY_ITEMS: readonly CanalesPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` discipline before READY when channels-related web releases ship.",
  },
  {
    id: "rb-channels",
    source: "runbook",
    area: "CHANNEL CONFIG",
    status: "ok",
    description: "Email, SMS, WhatsApp, push, in-app claims checked against `/app/communications` — no phantom providers.",
  },
  {
    id: "rb-templates",
    source: "runbook",
    area: "TEMPLATES",
    status: "ok",
    description: "Template naming, variants, and consent copy traceable — no invisible sends.",
  },
  {
    id: "rb-segmentation",
    source: "runbook",
    area: "SEGMENTATION",
    status: "warn",
    description: "Audience definitions lawful and documented — template does not ingest external CDPs.",
  },
  {
    id: "rb-automations",
    source: "runbook",
    area: "AUTOMATIONS",
    status: "ok",
    description: "Jobs/webhooks only where `/automations/*` posture supports the story.",
  },
  {
    id: "rb-deliverability",
    source: "runbook",
    area: "DELIVERABILITY",
    status: "warn",
    description: "Bounce/suppression narrative realistic — no inbox placement guarantees.",
  },
  {
    id: "rb-metrics",
    source: "runbook",
    area: "METRICS",
    status: "ok",
    description: "Opens/clicks/delivery framed per observable product signals — expectations only in-template.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Canales y Comunicaciones Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Channel config, templates/copy, segmentation, automations, deliverability, reporting — P1–P3 + statuses only.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildCanalesPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external channel APIs",
    status: "ok",
    description: "No ESP/SMS/WhatsApp API wiring from this OS template.",
  },
  {
    id: "tmpl-v1",
    source: "template",
    area: "CANALES v1 boundary",
    status: "ok",
    description: "Does not modify closed CANALES v1 infra — consumes existing workspace routes as links.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "`/os/canales-comunicaciones-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
