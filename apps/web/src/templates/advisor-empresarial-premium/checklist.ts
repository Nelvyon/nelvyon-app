/**
 * OS delivery QA aligned with backend/ops/runbooks/advisor_empresarial_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type AdvisorPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface AdvisorPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: AdvisorPremiumDeliveryStatus;
}

export const ADVISOR_PREMIUM_DELIVERY_ITEMS: readonly AdvisorPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description:
      "Golden path contract honored before READY — run `pnpm gate` when advisor-related web releases ship; see `/os/excellence/golden-path`.",
  },
  {
    id: "rb-diagnosis",
    source: "runbook",
    area: "DIAGNOSIS",
    status: "ok",
    description: "Problem framing and stakeholder map evidenced — aligns with narratives checkable via `/app/advisor`.",
  },
  {
    id: "rb-strategy-plan",
    source: "runbook",
    area: "STRATEGY & PLAN",
    status: "ok",
    description: "Strategy deltas and dated action milestones explicit; owners named outside product if needed.",
  },
  {
    id: "rb-kpis",
    source: "runbook",
    area: "KPIs",
    status: "warn",
    description: "KPI definitions + baselines honest — template does not ingest external analytics APIs.",
  },
  {
    id: "rb-followup",
    source: "runbook",
    area: "FOLLOW-UP",
    status: "ok",
    description: "Review cadence stated; rotations documented — no orphan engagements.",
  },
  {
    id: "rb-deliverables",
    source: "runbook",
    area: "DELIVERABLES",
    status: "ok",
    description: "Pack list reconciled vs what shipped; reporting section closes without inflated claims.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Advisor Empresarial Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Diagnosis, strategy, action plan, KPIs, follow-up/review, deliverables/reporting — P1–P3 + statuses only.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildAdvisorPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external strategy APIs",
    status: "ok",
    description: "No third-party consultancy or market-data integrations from this OS template.",
  },
  {
    id: "tmpl-v1",
    source: "template",
    area: "ADVISOR v1 boundary",
    status: "ok",
    description: "Does not modify closed ADVISOR v1 infra — consumes `/app/advisor` and related workspace links.",
  },
  {
    id: "tmpl-responsive",
    source: "template",
    area: "Responsive QA",
    status: "warn",
    description: "`/os/advisor-empresarial-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
