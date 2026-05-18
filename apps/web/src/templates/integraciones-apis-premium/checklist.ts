/**
 * OS delivery QA aligned with backend/ops/runbooks/integraciones_apis_premium_nelvyon_v1.md
 * v2: NELVYON Design System primitives applied — see `/os/design-system`.
 */

export type IntegracionPremiumDeliveryStatus = "ok" | "warn" | "crit" | "pending";

export interface IntegracionPremiumDeliveryItem {
  id: string;
  source: "runbook" | "template";
  area: string;
  description: string;
  status: IntegracionPremiumDeliveryStatus;
}

export const INTEGRACION_PREMIUM_DELIVERY_ITEMS: readonly IntegracionPremiumDeliveryItem[] = [
  {
    id: "rb-ready",
    source: "runbook",
    area: "READY",
    status: "ok",
    description: "Golden path / `pnpm gate` when integration-related surfaces ship in the same release train.",
  },
  {
    id: "rb-analysis",
    source: "runbook",
    area: "ANALYSIS & DESIGN",
    status: "ok",
    description:
      "OpenAPI/contract, pagination, idempotency — types: rest_api, webhook, crm_sync, payment_gateway, erp_sync, oauth, third_party_sdk, data_pipeline.",
  },
  {
    id: "rb-auth",
    source: "runbook",
    area: "AUTH & SECURITY",
    status: "warn",
    description: "OAuth scopes, mTLS, key rotation — no secrets pasted into OS preview.",
  },
  {
    id: "rb-dev",
    source: "runbook",
    area: "DEVELOPMENT & IMPLEMENTATION",
    status: "warn",
    description: "Phased rollout and rollback — no live vendor API calls from template.",
  },
  {
    id: "rb-test",
    source: "runbook",
    area: "TESTING & QA",
    status: "ok",
    description: "Contract + negative tests — execution in CI/env cliente, not desde OS.",
  },
  {
    id: "rb-docs",
    source: "runbook",
    area: "TECHNICAL DOCUMENTATION",
    status: "ok",
    description: "Postman/OpenAPI deliverables listed — no auto-hosted spec from NELVYON unless product ships it.",
  },
  {
    id: "rb-monitor",
    source: "runbook",
    area: "MONITORING",
    status: "ok",
    description: "SLOs and alert routing — cross-check `/os/observability` for ops posture.",
  },
  {
    id: "rb-handoff",
    source: "runbook",
    area: "DELIVERY & HANDOFF",
    status: "ok",
    description: "Runbooks + RACI — contrast `/automations/webhooks` when inbound events overlap.",
  },
  {
    id: "tmpl-ds-v2",
    source: "template",
    area: "Design System v2",
    status: "ok",
    description:
      "Integraciones y APIs Premium preview uses `@/design-system` semantic tokens and NelvyonDs components; compare with `/os/design-system`.",
  },
  {
    id: "tmpl-sections",
    source: "template",
    area: "Deliverable modules",
    status: "ok",
    description:
      "Analysis/design, auth/security, dev/implementation, testing/QA, technical docs, monitoring, delivery/handoff — P1–P3 + type badges where set.",
  },
  {
    id: "tmpl-meta",
    source: "template",
    area: "Metadata helper",
    status: "ok",
    description: "`buildIntegracionPremiumMetadata` for preview OG/Twitter defaults.",
  },
  {
    id: "tmpl-no-impl",
    source: "template",
    area: "No real integrations",
    status: "ok",
    description: "Does not implement connectors, schedules, or SDK initialization from this page.",
  },
  {
    id: "tmpl-no-apis",
    source: "template",
    area: "No external APIs",
    status: "ok",
    description: "No outbound calls to payment, CRM, ERP, or arbitrary third-party hosts from OS template.",
  },
  {
    id: "tmpl-cross-auto",
    source: "template",
    area: "Automation overlap",
    status: "ok",
    description: "When flows consume APIs, align paperwork with `/os/consultoria-automatizacion-premium/preview`.",
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
    description: "`/os/integraciones-apis-premium/preview` at mobile / tablet / desktop, clean console.",
  },
] as const;
