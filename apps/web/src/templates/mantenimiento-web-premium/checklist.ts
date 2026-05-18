/**
 * OS delivery QA aligned with backend/ops/runbooks/mantenimiento_web_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type MantenimientoPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface MantenimientoPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: MantenimientoPremiumDeliveryStatus;
}

export const MANTENIMIENTO_PREMIUM_DELIVERY_ITEMS: readonly MantenimientoPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when maintenance-related surfaces ship in the same release train.",
  },
  {
    id: "rb-audit",
    source: "runbook",
    area: "INITIAL AUDIT",
    status: "ok",
    description: "Stack, deps, risks — types: actualizaciones, backups, seguridad, rendimiento, uptime, seo_tecnico, soporte, reporting.",
  },
  {
    id: "rb-updates",
    source: "runbook",
    area: "UPDATES & PATCHES",
    status: "warn",
    description: "Cadence and emergency path — no auto-deploy from OS template.",
  },
  {
    id: "rb-backup",
    source: "runbook",
    area: "BACKUPS & RECOVERY",
    status: "ok",
    description: "RPO/RTO + restore drills — no backup vendor API hooks from checklist.",
  },
  {
    id: "rb-security",
    source: "runbook",
    area: "SECURITY & HARDENING",
    status: "warn",
    description: "Headers, TLS, vuln SLAs — evidence stays in security tooling outside NELVYON.",
  },
  {
    id: "rb-perf",
    source: "runbook",
    area: "PERFORMANCE & CWV",
    status: "ok",
    description: "Budgets and third-party script policy — `/os/web-premium/preview` when front scope overlaps.",
  },
  {
    id: "rb-uptime",
    source: "runbook",
    area: "UPTIME & MONITORING",
    status: "ok",
    description: "SLOs and paging — cross-check `/os/observability` and `/os/observability/incidents` for ops posture.",
  },
  {
    id: "rb-report",
    source: "runbook",
    area: "MONTHLY REPORTING",
    status: "ok",
    description: "Incidents + changes + metrics — no live telemetry pull from OS preview.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Mantenimiento web Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Initial audit, updates/patches, backups/recovery, security/hardening, performance/CWV, uptime/monitoring, monthly reporting — P1–P3 + type badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildMantenimientoPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-monitor",
    source: "template",
    area: "No real monitoring",
    status: "ok",
    description: "Does not configure probes, synthetics, or paging integrations from this page.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external APIs",
    status: "ok",
    description: "No CDN/WAF/backup SaaS connectors from this OS template.",
  },
  {
    id: "tmpl-seo-cross",
    source: "template",
    area: "SEO technical overlap",
    status: "ok",
    description: "When crawl/index hygiene is in scope, align paperwork with `/os/seo-premium/preview`.",
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
    description: "`/os/mantenimiento-web-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
