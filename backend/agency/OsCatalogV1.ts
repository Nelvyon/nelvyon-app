/**
 * NELVYON OS Catalog v1 — versioned SSOT of defined services (ADR-053).
 * Status vocabulary: IMPLEMENTED_VERIFIED | PREPARED_OFF | BLOCKED_EXTERNAL | BLOCKED_CEO | BLOCKED_LEGAL | NOT_IMPLEMENTED
 * Never mark IMPLEMENTED_VERIFIED without evidence.
 */

export const OS_CATALOG_V1_VERSION = "1.0.0" as const;

export type OsCatalogV1Status =
  | "IMPLEMENTED_VERIFIED"
  | "PREPARED_OFF"
  | "BLOCKED_EXTERNAL"
  | "BLOCKED_CEO"
  | "BLOCKED_LEGAL"
  | "NOT_IMPLEMENTED";

export type OsCatalogV1Entry = {
  serviceId: string;
  title: string;
  teamId: string;
  playbookPath: string;
  kickoffPackIds: string[];
  permissions: string[];
  forbidden: string[];
  deliverables: string[];
  qaRubric: { min: number; criticalMin: number };
  independentAuditor: boolean;
  portalPath: string;
  metrics: string[];
  tests: string[];
  e2eEvidence: string | null;
  status: OsCatalogV1Status;
  nextAction: string;
};

const forbidSpend = ["paid_spend", "oauth_spend", "send_mass_campaign", "charge_payment"] as const;

export const OS_CATALOG_V1: readonly OsCatalogV1Entry[] = [
  {
    serviceId: "web_landing",
    title: "Web / Landing",
    teamId: "svc_web_ux_cro",
    playbookPath: "docs/agency-playbooks/SERVICE_WEB.md",
    kickoffPackIds: ["local-business-growth", "ecommerce-growth", "saas-b2b-growth"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["landing_url", "informe"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score", "auto_approve"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "pack E2E growth 2026-07-24",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener",
  },
  {
    serviceId: "seo",
    title: "SEO",
    teamId: "svc_seo_content",
    playbookPath: "docs/agency-playbooks/SERVICE_SEO.md",
    kickoffPackIds: ["local-business-growth", "ecommerce-growth", "saas-b2b-growth"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["keywords", "informe"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "pack E2E growth 2026-07-24",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener",
  },
  {
    serviceId: "content_social",
    title: "Redes sociales integral",
    teamId: "svc_social_creative",
    playbookPath: "docs/agency-playbooks/SERVICE_CONTENT_SOCIAL.md",
    kickoffPackIds: ["social-calendar-pack", "content-strategy-pack", "brand-voice-pack"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend, "publish_post", "oauth_connect", "mass_dm"],
    deliverables: [
      "estrategia_mensual",
      "calendario_30d",
      "kit_multired",
      "playbook_cm_paid_off",
    ],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["reach", "engagement", "qa_score"],
    tests: [
      "backend/agency/__tests__/OsSocialNetworksService.test.ts",
      "backend/agency/__tests__/OsCatalogV1Closure.test.ts",
    ],
    e2eEvidence: "scripts/docs/evidence/os-saas-e2e/modules/social.adr052_e2e.md",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener gates publish/paid OFF",
  },
  {
    serviceId: "strategy",
    title: "Strategy",
    teamId: "svc_strategy_brand",
    playbookPath: "docs/agency-playbooks/SERVICE_STRATEGY.md",
    kickoffPackIds: ["strategy-pack"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["strategy_brief", "informe"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "new-os-packs-e2e-2026-07-24T02-55-24",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener",
  },
  {
    serviceId: "funnel",
    title: "Funnel growth",
    teamId: "svc_web_ux_cro",
    playbookPath: "docs/agency-playbooks/SERVICE_FUNNEL.md",
    kickoffPackIds: ["funnel-growth-pack"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["funnel_map", "informe"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score", "conversion_hypothesis"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "new-os-packs-e2e-2026-07-24T02-55-24",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener",
  },
  {
    serviceId: "retention",
    title: "Retention",
    teamId: "svc_retention_reputation",
    playbookPath: "docs/agency-playbooks/SERVICE_RETENTION.md",
    kickoffPackIds: ["retention-pack"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["retention_plan", "informe"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "new-os-packs-e2e-2026-07-24T02-55-24",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener",
  },
  {
    serviceId: "ecommerce",
    title: "Ecommerce growth",
    teamId: "svc_ecommerce_growth",
    playbookPath: "docs/agency-playbooks/SERVICE_ECOMMERCE.md",
    kickoffPackIds: ["ecommerce-growth"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["landing", "seo", "chatbot", "informe"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score", "auto_approve"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "ecommerce-pack-e2e-20260724",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener",
  },
  {
    serviceId: "crm_sales",
    title: "CRM / SaaS B2B growth",
    teamId: "svc_saas_b2b_growth",
    playbookPath: "docs/agency-playbooks/SERVICE_CRM.md",
    kickoffPackIds: ["saas-b2b-growth"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["landing", "seo", "chatbot", "informe"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "saas-b2b-pack-e2e-20260724",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener",
  },
  {
    serviceId: "reporting",
    title: "Analytics / reporting",
    teamId: "svc_analytics_reporting",
    playbookPath: "docs/agency-playbooks/SERVICE_BETA_PACKS.md",
    kickoffPackIds: ["analytics-setup-pack", "cro-audit-pack"],
    permissions: ["observe", "draft"],
    forbidden: [...forbidSpend],
    deliverables: ["event_map", "ga4_gsc_setup", "dashboard"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "beta-packs-e2e-2026-07-24T13-42-38",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener GA4/GSC (ADR-048)",
  },
  {
    serviceId: "email",
    title: "Email / lifecycle",
    teamId: "svc_email_lifecycle",
    playbookPath: "docs/agency-playbooks/SERVICE_EMAIL.md",
    kickoffPackIds: [],
    permissions: ["draft", "assisted"],
    forbidden: ["send_mass_campaign", ...forbidSpend],
    deliverables: ["welcome_email_pack", "sequence_draft"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["deliverability"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "pack welcome email path (SES ops)",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "campañas masivas BLOCKED_CEO/LEGAL",
  },
  {
    serviceId: "ads",
    title: "Ads / paid media",
    teamId: "svc_ads_attribution",
    playbookPath: "docs/agency-playbooks/SERVICE_ADS.md",
    kickoffPackIds: [],
    permissions: ["draft"],
    forbidden: [...forbidSpend, "oauth_connect", "publish_ads"],
    deliverables: ["ads_kit_off"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["none_until_oauth"],
    tests: ["backend/agency/__tests__/OsCatalogV1Closure.test.ts"],
    e2eEvidence: null,
    status: "BLOCKED_EXTERNAL",
    nextAction: "OAuth + presupuesto CEO",
  },
  {
    serviceId: "automations",
    title: "Automations / workflows",
    teamId: "svc_automations_crm",
    playbookPath: "docs/agency-playbooks/SERVICE_AUTOMATIONS.md",
    kickoffPackIds: [],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["workflow_draft"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/saas/workflows",
    metrics: ["workflow_runs"],
    tests: ["backend/agency/__tests__/OsCatalogV1Closure.test.ts"],
    e2eEvidence: null,
    status: "PREPARED_OFF",
    nextAction: "Pack OS opcional + E2E mesh",
  },
  {
    serviceId: "reputation",
    title: "Reputation / reviews",
    teamId: "svc_retention_reputation",
    playbookPath: "docs/agency-playbooks/SERVICE_REPUTATION.md",
    kickoffPackIds: [],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend, "sensitive_auto_reply"],
    deliverables: ["reputation_playbook"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/saas",
    metrics: ["sentiment"],
    tests: ["backend/agency/__tests__/OsCatalogV1Closure.test.ts"],
    e2eEvidence: null,
    status: "PREPARED_OFF",
    nextAction: "Pack OS + E2E",
  },
  {
    serviceId: "support",
    title: "Support / chatbot ops",
    teamId: "svc_retention_reputation",
    playbookPath: "docs/agency-playbooks/SERVICE_SUPPORT.md",
    kickoffPackIds: ["local-business-growth"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["chatbot_url"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score"],
    tests: ["backend/agency/__tests__/OsEliteAgency.test.ts"],
    e2eEvidence: "pack chatbot SKU E2E growth",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener",
  },
  {
    serviceId: "independent_auditor",
    title: "Auditor independiente",
    teamId: "global_independent_auditor",
    playbookPath: "docs/agency-playbooks/TEAMS_QA_ELITE.md",
    kickoffPackIds: [],
    permissions: ["observe"],
    forbidden: ["self_approve_critical", "publish_post"],
    deliverables: ["audit_session_evidence"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["approve", "reject", "repair"],
    tests: ["backend/agency/__tests__/OsCatalogV1Closure.test.ts"],
    e2eEvidence: "scripts/docs/evidence/os-saas-e2e/modules/auditor.openclaw.catalog_v1.md",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "staging flag ON · prod OFF",
  },
  {
    serviceId: "openclaw_coordination",
    title: "OpenClaw coordination (staging)",
    teamId: "global_direction",
    playbookPath: "docs/PHASE2_OPENCLAW.md",
    kickoffPackIds: [],
    permissions: ["draft"],
    forbidden: [...forbidSpend, "touch_production", "send_mass_campaign"],
    deliverables: ["coordination_trace"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["idempotency", "tenant_isolation", "retries"],
    tests: ["backend/agency/__tests__/OsCatalogV1Closure.test.ts"],
    e2eEvidence: "scripts/docs/evidence/os-saas-e2e/modules/auditor.openclaw.catalog_v1.md",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "staging_mock only · prod BLOCKED_CEO",
  },
  {
    serviceId: "influencers_pr",
    title: "Influencers / PR externos",
    teamId: "svc_social_creative",
    playbookPath: "docs/agency-playbooks/SERVICE_CONTENT_SOCIAL.md",
    kickoffPackIds: [],
    permissions: ["draft"],
    forbidden: [...forbidSpend],
    deliverables: [],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: [],
    tests: [],
    e2eEvidence: null,
    status: "NOT_IMPLEMENTED",
    nextAction: "Definir contrato + pack",
  },
] as const;

export function listOsCatalogV1(): OsCatalogV1Entry[] {
  return [...OS_CATALOG_V1];
}

export function assertOsCatalogV1Integrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (OS_CATALOG_V1_VERSION !== "1.0.0") violations.push("version_mismatch");
  for (const e of OS_CATALOG_V1) {
    if (!e.teamId) violations.push(`no_team:${e.serviceId}`);
    if (!e.playbookPath) violations.push(`no_playbook:${e.serviceId}`);
    if (e.qaRubric.min < 85) violations.push(`qa_below_85:${e.serviceId}`);
    if (e.status === "IMPLEMENTED_VERIFIED" && !e.e2eEvidence) {
      violations.push(`verified_without_evidence:${e.serviceId}`);
    }
    if (e.status === "IMPLEMENTED_VERIFIED" && e.tests.length === 0) {
      violations.push(`verified_without_tests:${e.serviceId}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function osCatalogV1Summary(): Record<OsCatalogV1Status, number> {
  const out: Record<OsCatalogV1Status, number> = {
    IMPLEMENTED_VERIFIED: 0,
    PREPARED_OFF: 0,
    BLOCKED_EXTERNAL: 0,
    BLOCKED_CEO: 0,
    BLOCKED_LEGAL: 0,
    NOT_IMPLEMENTED: 0,
  };
  for (const e of OS_CATALOG_V1) out[e.status] += 1;
  return out;
}
