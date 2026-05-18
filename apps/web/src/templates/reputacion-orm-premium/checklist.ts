/**
 * OS delivery QA aligned with backend/ops/runbooks/reputacion_online_orm_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type OrmPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface OrmPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: OrmPremiumDeliveryStatus;
}

export const ORM_PREMIUM_DELIVERY_ITEMS: readonly OrmPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when ORM-related surfaces ship in the same release train.",
  },
  {
    id: "rb-audit",
    source: "runbook",
    area: "REPUTATION AUDIT",
    status: "ok",
    description:
      "Sources and severity — types: auditoria_reputacion, gestion_resenas, contenido_positivo, supresion_negativo, monitorizacion_marca, crisis_management, reporting.",
  },
  {
    id: "rb-reviews",
    source: "runbook",
    area: "REVIEW MANAGEMENT",
    status: "ok",
    description: "SLAs and compliant tone — no scraping of review platforms from OS template.",
  },
  {
    id: "rb-positive",
    source: "runbook",
    area: "POSITIVE CONTENT",
    status: "ok",
    description: "Owned narrative plan — `/os/contenido-copywriting-premium/preview` when copy governance overlaps.",
  },
  {
    id: "rb-negative",
    source: "runbook",
    area: "NEGATIVE MITIGATION",
    status: "warn",
    description: "Lawful takedown / dispute paths only — no guaranteed suppression promises.",
  },
  {
    id: "rb-monitor",
    source: "runbook",
    area: "CONTINUOUS MONITORING",
    status: "warn",
    description: "Keywords and alert routing — no external monitoring API hooks from checklist.",
  },
  {
    id: "rb-crisis",
    source: "runbook",
    area: "CRISIS MANAGEMENT",
    status: "ok",
    description: "RACI and legal gates — `/help` for escalation when policy unclear.",
  },
  {
    id: "rb-report",
    source: "runbook",
    area: "MONTHLY REPORTING",
    status: "ok",
    description: "Metrics definitions limited — `/os/seo-premium/preview` when SERP narrative binds.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Reputación online y ORM Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Reputation audit, reviews, positive content, negative mitigation, monitoring, crisis, monthly reporting — P1–P3 + type badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildOrmPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No monitoring APIs",
    status: "ok",
    description: "No Brandwatch/Mention/Google Business API connectors from this OS template.",
  },
  {
    id: "tmpl-no-scrape",
    source: "template",
    area: "No scraping",
    status: "ok",
    description: "No scraping of reviews, maps listings, or social feeds from this preview.",
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
    description: "`/os/reputacion-orm-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
