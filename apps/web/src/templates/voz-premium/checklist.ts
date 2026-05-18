/**
 * OS delivery QA aligned with backend/ops/runbooks/voz_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type VozPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface VozPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: VozPremiumDeliveryStatus;
}

export const VOZ_PREMIUM_DELIVERY_ITEMS: readonly VozPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path green before signing off voice deliverables (`pnpm gate`).",
  },
  {
    id: "rb-pilot",
    source: "runbook",
    area: "PILOT ALIGNMENT",
    status: "ok",
    description: "`/app/voz` reviewed: plan allowlist, monthly cap, honest pilot limitations.",
  },
  {
    id: "rb-paths",
    source: "runbook",
    area: "PRODUCT PATHS",
    status: "ok",
    description: "Inbound `/app/voz/inbound` and outbound synth `/app/voz/outbound-synth` aligned with engagement scope when applicable.",
  },
  {
    id: "rb-stability",
    source: "runbook",
    area: "STABILITY",
    status: "warn",
    description: "`/os/observability` reviewed if deploys touch voice-adjacent assets.",
  },
  {
    id: "rb-handoff",
    source: "runbook",
    area: "HANDOFF",
    status: "ok",
    description: "Human escalation documented where automation ends (support / next human step).",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Voz Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Agent config, voice quality, script/flow, localization, handoff, reporting — statuses + P1–P3 only; no new voice infra.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildVozPremiumMetadata` for preview route OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external voice APIs",
    status: "ok",
    description: "No Twilio/CCaaS/paid STT-TTS — checklist is OS delivery record only in v1.",
  },
  {
    id: "tmpl-v2",
    source: "template",
    area: "VOZ v2 boundary",
    status: "ok",
    description: "Does not modify VOZ v2 codepaths — links consume existing closed pilot surfaces.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "Verify `/os/voz-premium/preview` at mobile / tablet / desktop with clean console.",
  },
] as const;
