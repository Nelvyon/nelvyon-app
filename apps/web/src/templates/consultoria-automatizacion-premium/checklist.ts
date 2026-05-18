/**
 * OS delivery QA aligned with backend/ops/runbooks/consultoria_automatizacion_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type AutomatizacionPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface AutomatizacionPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: AutomatizacionPremiumDeliveryStatus;
}

export const AUTOMATIZACION_PREMIUM_DELIVERY_ITEMS: readonly AutomatizacionPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when automation-related surfaces ship in the same release train.",
  },
  {
    id: "rb-diagnosis",
    source: "runbook",
    area: "PROCESS DIAGNOSIS",
    status: "ok",
    description: "As-is/to-be, owners, PII — no live data sync from this checklist.",
  },
  {
    id: "rb-flow",
    source: "runbook",
    area: "FLOW MAP",
    status: "ok",
    description: "Triggers, branches, SLAs — types: workflow, webhook, crm_automation, email_sequence, lead_scoring, reporting_auto, integration_flow.",
  },
  {
    id: "rb-design",
    source: "runbook",
    area: "AUTOMATION DESIGN",
    status: "warn",
    description: "Type matrix vs contract — contrast `/automations/jobs` and `/automations/webhooks` for product posture only.",
  },
  {
    id: "rb-impl",
    source: "runbook",
    area: "IMPLEMENTATION",
    status: "warn",
    description: "Phasing and credentials handling documented — no external iPaaS API hooks from OS template.",
  },
  {
    id: "rb-test",
    source: "runbook",
    area: "TESTING & VALIDATION",
    status: "ok",
    description: "UAT cases + negative paths — no execution of client workflows from preview.",
  },
  {
    id: "rb-docs",
    source: "runbook",
    area: "DOCUMENTATION",
    status: "ok",
    description: "Runbooks and RACI listed — handoff stays outside NELVYON unless product ships it.",
  },
  {
    id: "rb-reporting",
    source: "runbook",
    area: "REPORTING & METRICS",
    status: "ok",
    description: "KPI definitions limited — `/os/email-marketing-premium/preview` when email_sequence overlaps ESP paperwork.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Consultoría de automatización Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Diagnosis, flow map, design, implementation, testing, documentation, reporting — P1–P3 + type badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildAutomatizacionPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-flows",
    source: "template",
    area: "No real automations",
    status: "ok",
    description: "Does not create workflows, schedules, or webhook receivers from this page.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external APIs",
    status: "ok",
    description: "No CRM, ESP, or iPaaS connectors from this OS template.",
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
    description: "`/os/consultoria-automatizacion-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
