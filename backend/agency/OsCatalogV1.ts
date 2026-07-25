/**
 * NELVYON OS Catalog v1 — versioned SSOT of defined services (ADR-053).
 * Status vocabulary: IMPLEMENTED_VERIFIED | PREPARED_OFF | BLOCKED_EXTERNAL | BLOCKED_CEO | BLOCKED_LEGAL | NOT_IMPLEMENTED
 * Never mark IMPLEMENTED_VERIFIED without evidence.
 *
 * v1.1.0: adds `roles` (auto-derived from `OsProfessionalTeams` by `teamId`), `flow`
 * (deliverable flow — service-specific for social/`svc_social_creative`, `OS_DELIVERABLE_FLOW`
 * otherwise), and `certificationCriteria` (auto-derived, never empty; required non-empty for
 * IMPLEMENTED_VERIFIED per `assertOsCatalogV1Integrity`).
 *
 * v1.2.0 (ADR-055 closure): wires `automations`/`reputation` kickoff packs
 * (`automations-ops-pack` / `reputation-ops-pack`, flags default OFF outside staging),
 * richer `nelvyon_official_social` deliverables (profiles/contents/brand library/manual
 * publish fail-closed), `creative_direction` step for `visual_elite_strategy`, and a new
 * `shared_memory_mcp_staging` entry for the synthetic-only SM/MCP staging harness. All
 * remain PREPARED_OFF until parent promotes after real staging E2E evidence.
 *
 * v1.3.0: wires `influencers_pr` to its kickoff pack (`influencers-pr-pack`, flag
 * `NELVYON_INFLUENCERS_PR_PACK` OFF outside staging — no real influencer network, no
 * outreach send). Adds `ads_attribution_core` (synthetic campaign/attribution core,
 * providers fail-closed, `NELVYON_ADS_SPEND_ENABLED=0`) and `community_publish_core`
 * (content/calendar/approval core, `SimulatorPublishProvider` only, publish fail-closed
 * unless OAuth+CEO). All three remain `PREPARED_OFF`/`NOT_IMPLEMENTED` until real staging
 * E2E evidence promotes them — never claim `IMPLEMENTED_VERIFIED` without it.
 *
 * v1.4.0 (ADR-056 blocks 11/16/17): adds `telephony_core` (dialer domain model — consent,
 * queue, draft-only campaigns, recording defaults off — `SimulatorTelephonyProvider`
 * VERIFIED, real provider permanently `BLOCKED_EXTERNAL` via a constructor that always
 * throws), `oauth_multitenant` (tenant-scoped OAuth framework — AES-256-GCM vault, PKCE,
 * CSRF state, min-scopes policy — mock providers only, VERIFIED), and
 * `integrations_marketplace` (internal-only manifest catalog + per-tenant install
 * lifecycle, VERIFIED via the built-in `nelvyon.internal.ping` integration). No spend, no
 * real network calls, no Twilio live dial in any of the three.
 */

import { OS_DELIVERABLE_FLOW, getOsProfessionalTeam, type OsTeamId } from "./OsProfessionalTeams";
import { SOCIAL_SERVICE_FLOW } from "./OsSocialNetworksService";

export const OS_CATALOG_V1_VERSION = "1.4.0" as const;

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
  /** Role ids of the assigned team — auto-derived from `OsProfessionalTeams` by `teamId`. */
  roles?: string[];
  /** Deliverable flow for this service — `OS_DELIVERABLE_FLOW` or service-specific (social). */
  flow?: readonly string[];
  /** Non-empty checklist a service must satisfy to earn/keep IMPLEMENTED_VERIFIED. */
  certificationCriteria?: string[];
};

const forbidSpend = ["paid_spend", "oauth_spend", "send_mass_campaign", "charge_payment"] as const;

type OsCatalogV1RawEntry = Omit<OsCatalogV1Entry, "roles" | "flow" | "certificationCriteria">;

const OS_CATALOG_V1_RAW: readonly OsCatalogV1RawEntry[] = [
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
    kickoffPackIds: ["automations-ops-pack"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend],
    deliverables: ["workflow_map", "trigger_playbook", "crm_automation_draft", "qa_ops_checklist", "informe"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/saas/workflows",
    metrics: ["workflow_runs", "qa_score"],
    tests: [
      "backend/agency/__tests__/OsCatalogV1Closure.test.ts",
      "apps/web/src/lib/packs/__tests__/automationsReputationPacksRunners.test.ts",
    ],
    e2eEvidence: "scripts/docs/evidence/os-saas-e2e/modules/automations_reputation_e2e_latest.md",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener · flag OFF fuera staging · sin campañas masivas",
  },
  {
    serviceId: "reputation",
    title: "Reputation / reviews",
    teamId: "svc_retention_reputation",
    playbookPath: "docs/agency-playbooks/SERVICE_REPUTATION.md",
    kickoffPackIds: ["reputation-ops-pack"],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend, "sensitive_auto_reply", "mass_dm"],
    deliverables: [
      "review_monitoring_playbook",
      "response_templates",
      "reputation_recovery_plan",
      "trust_signals_kit",
      "informe",
    ],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/saas",
    metrics: ["sentiment", "avg_rating", "qa_score"],
    tests: [
      "backend/agency/__tests__/OsCatalogV1Closure.test.ts",
      "apps/web/src/lib/packs/__tests__/automationsReputationPacksRunners.test.ts",
    ],
    e2eEvidence: "scripts/docs/evidence/os-saas-e2e/modules/automations_reputation_e2e_latest.md",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "mantener · flag OFF fuera staging · mass_dm forever OFF",
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
    deliverables: ["coordination_trace", "audit_trail_export", "rollback_checklist"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: [
      "idempotency",
      "tenant_isolation",
      "retries",
      "team_assignments",
      "backoff_plan",
      "unauthorized_rejection",
      "failure_injection_recovery",
    ],
    tests: ["backend/agency/__tests__/OsCatalogV1Closure.test.ts"],
    e2eEvidence: "scripts/docs/evidence/os-saas-e2e/modules/auditor.openclaw.catalog_v1.md",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "staging_mock only · prod BLOCKED_CEO",
  },
  {
    serviceId: "visual_elite_strategy",
    title: "Generación visual élite (strategy_only)",
    teamId: "svc_social_creative",
    playbookPath: "docs/agency-playbooks/SERVICE_CONTENT_SOCIAL.md",
    kickoffPackIds: [],
    permissions: ["draft"],
    forbidden: [...forbidSpend, "paid_render_without_approval"],
    deliverables: [
      "brief",
      "creative_direction",
      "script",
      "storyboard",
      "prompts",
      "variants",
      "visual_qa",
      "delivery_package",
    ],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["cost_cents_zero", "variants_min_2", "human_approval_gate"],
    tests: ["backend/agency/__tests__/VisualEliteStrategy.test.ts"],
    e2eEvidence: "backend/agency/__tests__/VisualEliteStrategy.test.ts (strategy_only · spend OFF)",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "CEO auth before any paid provider · NELVYON_VISUAL_GENERATION_ENABLED=0",
  },
  {
    serviceId: "nelvyon_official_social",
    title: "Redes oficiales NELVYON (prep)",
    teamId: "svc_social_creative",
    playbookPath: "docs/ops/NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md",
    kickoffPackIds: ["social-calendar-pack"],
    permissions: ["draft"],
    forbidden: [...forbidSpend, "publish_post", "oauth_connect", "mass_dm"],
    deliverables: [
      "official_strategy",
      "calendar",
      "profiles",
      "contents",
      "brand_library",
      "analytics_plan",
      "permissions_matrix",
      "ceo_approval_gate",
      "manual_publish_pathway_fail_closed",
      "single_test_post_protocol",
      "rollback_plan",
      "qa_rubric",
      "ceo_account_checklist",
    ],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["accounts_pending_ceo"],
    tests: [
      "backend/agency/__tests__/NelvyonOfficialSocialPrep.test.ts",
      "backend/agency/__tests__/NelvyonOfficialSocialOps.test.ts",
    ],
    e2eEvidence: null,
    status: "PREPARED_OFF",
    nextAction: "CEO abrir/conectar 8 cuentas · sin publish hasta OAuth + aprobación CEO explícita",
  },
  {
    serviceId: "shared_memory_mcp_staging",
    title: "Shared Memory + MCP (staging sintético)",
    teamId: "global_security_compliance",
    playbookPath: "docs/PHASE2_OPENCLAW.md",
    kickoffPackIds: [],
    permissions: ["observe"],
    forbidden: [...forbidSpend, "touch_production", "productive_mcp_without_staging_synthetic"],
    deliverables: ["tenant_isolation_evidence", "audit_log", "deny_by_default_report", "rollback_flag_list"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["tenant_isolation_ok", "deny_by_default_ok"],
    tests: ["backend/agency/__tests__/StagingSharedMemoryMcpHarness.test.ts"],
    e2eEvidence: "scripts/docs/evidence/os-saas-e2e/modules/sm-mcp.synthetic_latest.md",
    status: "IMPLEMENTED_VERIFIED",
    nextAction:
      "mantener staging-only · NELVYON_SHARED_MEMORY_ENABLED=0 · NELVYON_MCP_PRODUCTIVE_ENABLED=0 · prod BLOCKED_CEO",
  },
  {
    serviceId: "influencers_pr",
    title: "Influencers / PR externos",
    teamId: "svc_social_creative",
    playbookPath: "docs/agency-playbooks/SERVICE_INFLUENCERS_PR.md",
    kickoffPackIds: ["influencers-pr-pack"],
    permissions: ["draft"],
    forbidden: [...forbidSpend, "real_outreach_send", "publish_post"],
    deliverables: [
      "research_matching",
      "scoring_sheet",
      "brief_outreach",
      "contract_checklist",
      "metrics_plan",
      "informe",
    ],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["qa_score"],
    tests: ["apps/web/src/lib/packs/__tests__/influencersPrPacksRunners.test.ts"],
    e2eEvidence: null,
    status: "PREPARED_OFF",
    nextAction: "Flag NELVYON_INFLUENCERS_PR_PACK ON en staging + smoke E2E antes de promover",
  },
  {
    serviceId: "ads_attribution_core",
    title: "Ads & attribution (core, providers OFF)",
    teamId: "svc_ads_attribution",
    playbookPath: "docs/agency-playbooks/SERVICE_ADS.md",
    kickoffPackIds: [],
    permissions: ["draft"],
    forbidden: [...forbidSpend, "oauth_connect", "publish_ads"],
    deliverables: [
      "campaign_draft",
      "audiences_synthetic",
      "utm_plan",
      "conversion_events_log",
      "budget_cap_report",
      "reporting_snapshot",
    ],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["budget_cap_enforced", "spend_cents_zero"],
    tests: ["backend/agency/__tests__/AdsAttributionCore.test.ts"],
    e2eEvidence: null,
    status: "PREPARED_OFF",
    nextAction:
      "OAuth real + NELVYON_ADS_SPEND_ENABLED=1 + presupuesto CEO antes de conectar cualquier proveedor",
  },
  {
    serviceId: "community_publish_core",
    title: "Publish & community management (core)",
    teamId: "svc_social_creative",
    playbookPath: "docs/ops/SOCIAL_PUBLISH_OAUTH_CEO_CHECKLIST.md",
    kickoffPackIds: [],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend, "publish_post", "oauth_connect", "mass_dm", "real_direct_message"],
    deliverables: [
      "content_inbox",
      "editorial_calendar",
      "approval_workflow",
      "network_variants",
      "publish_queue_simulated",
      "moderation_escalation_log",
      "audit_trail",
    ],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["queue_depth", "escalation_rate"],
    tests: ["backend/agency/__tests__/CommunityPublishCore.test.ts"],
    e2eEvidence: null,
    status: "PREPARED_OFF",
    nextAction: "OAuth real + aprobación CEO explícita antes de habilitar cualquier publish real",
  },
  {
    serviceId: "telephony_core",
    title: "Dialer / Telefonía (core simulador)",
    teamId: "svc_automations_crm",
    playbookPath: "docs/agency-playbooks/SERVICE_DIALER.md",
    kickoffPackIds: [],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend, "real_outbound_call", "real_inbound_call", "construct_real_provider"],
    deliverables: ["call_queue_simulation", "consent_registry", "audit_log", "crm_timeline_stub"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/saas",
    metrics: ["tenant_isolation_ok", "opt_out_enforced", "rate_limit_respected"],
    tests: ["backend/agency/__tests__/TelephonyCore.test.ts"],
    e2eEvidence:
      "backend/agency/__tests__/TelephonyCore.test.ts (simulator-only, tenant isolation + opt-out + rate limit proven)",
    status: "IMPLEMENTED_VERIFIED",
    nextAction:
      "simulador VERIFIED · llamadas reales BLOCKED_EXTERNAL permanente · ver docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md",
  },
  {
    serviceId: "oauth_multitenant",
    title: "OAuth multi-tenant framework (mock)",
    teamId: "global_security_compliance",
    playbookPath: "docs/ops/OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md",
    kickoffPackIds: [],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend, "oauth_connect_real_provider"],
    deliverables: ["token_vault", "pkce_state_csrf", "tenant_scoped_connections", "audit_log"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/saas",
    metrics: ["encryption_round_trip_ok", "tenant_isolation_ok", "fail_closed_key_ok"],
    tests: ["backend/agency/__tests__/OAuthMultiTenantFramework.test.ts"],
    e2eEvidence:
      "backend/agency/__tests__/OAuthMultiTenantFramework.test.ts (mock providers, PKCE+CSRF+AES-256-GCM proven)",
    status: "IMPLEMENTED_VERIFIED",
    nextAction:
      "framework + mock providers VERIFIED · proveedores reales requieren docs/ops/OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md",
  },
  {
    serviceId: "integrations_marketplace",
    title: "Integrations marketplace v1 (interno)",
    teamId: "svc_automations_crm",
    playbookPath: "docs/ops/INTEGRATIONS_MARKETPLACE_V1.md",
    kickoffPackIds: [],
    permissions: ["draft", "assisted"],
    forbidden: [...forbidSpend, "publish_external_third_party"],
    deliverables: ["manifest_catalog", "tenant_install_lifecycle", "internal_ping_integration", "audit_log"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/saas",
    metrics: ["ping_healthcheck_ok", "tenant_isolation_ok", "publisher_gate_ok"],
    tests: ["backend/agency/__tests__/IntegrationsMarketplaceV1.test.ts"],
    e2eEvidence:
      "backend/agency/__tests__/IntegrationsMarketplaceV1.test.ts (internal nelvyon.internal.ping install+healthcheck proven)",
    status: "IMPLEMENTED_VERIFIED",
    nextAction: "internal ping VERIFIED · publicación de terceros (v2) no definida, sin plan hasta que se pida",
  },
  {
    serviceId: "private_vector_rag",
    title: "RAG vectorial privado (sintético + pgvector real local)",
    teamId: "global_security_compliance",
    playbookPath: "docs/ops/PRIVATE_RAG_RUNBOOK.md",
    kickoffPackIds: [],
    permissions: ["observe"],
    forbidden: [...forbidSpend, "openai_embeddings", "cross_tenant_retrieval"],
    deliverables: ["vector_ingest", "cosine_retrieval", "source_citations", "refuse_without_evidence", "tenant_isolation"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["tenant_isolation_ok", "refuse_without_evidence"],
    tests: ["backend/agency/__tests__/PrivateVectorRagCore.test.ts"],
    e2eEvidence:
      "scripts/docs/evidence/os-saas-e2e/modules/private-rag.synthetic_latest.md + " +
      "scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md",
    status: "IMPLEMENTED_VERIFIED",
    nextAction:
      "Docker local pgvector+Ollama = IMPLEMENTED_VERIFIED (evidencia pgvector-rag.live_latest.md, 2026-07-25) · " +
      "Railway staging pgvector = PREPARED_OFF (sin Postgres+pgvector en Railway; sin mesh Ollama aprobado) · " +
      "gap P2 minScore corpus pequeño en docs/KNOWN_ISSUES.md · CEO: provisionar staging solo vía " +
      "docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md",
  },
  {
    serviceId: "private_ai_canary_prep",
    title: "IA propia — prep canary productivo",
    teamId: "global_security_compliance",
    playbookPath: "docs/ops/CEO_IA_PROD_CANARY_REQUEST.md",
    kickoffPackIds: [],
    permissions: ["observe"],
    forbidden: [...forbidSpend, "touch_production", "openai_api"],
    deliverables: ["canary_checklist", "staging_drill", "kill_switch", "ceo_request"],
    qaRubric: { min: 85, criticalMin: 90 },
    independentAuditor: true,
    portalPath: "/portal",
    metrics: ["production_canary_authorized_false"],
    tests: ["backend/agency/__tests__/PrivateAiCanaryPrep.test.ts"],
    e2eEvidence: "backend/agency/__tests__/PrivateAiCanaryPrep.test.ts (isProductionCanaryAuthorized hard-false)",
    status: "PREPARED_OFF",
    nextAction:
      "CEO: docs/ops/CEO_IA_PROD_CANARY_REQUEST.md · prod OFF hasta autorización escrita · staging drill ahora " +
      "verifica en vivo OLLAMA_HOST contra Tailscale CGNAT/MagicDNS (checkOllamaHostForCanaryDrill, no autodeclarado)",
  },
] as const;

function buildCertificationCriteria(e: OsCatalogV1RawEntry): string[] {
  const criteria: string[] = [`QA score >= ${e.qaRubric.min} (critical >= ${e.qaRubric.criticalMin})`];
  if (e.independentAuditor) criteria.push("Independent auditor PASS (no self-approve)");
  if (e.tests.length) criteria.push(`Tests green: ${e.tests.join(", ")}`);
  criteria.push(e.e2eEvidence ? `E2E evidence: ${e.e2eEvidence}` : "E2E evidence pending");
  if (e.status !== "IMPLEMENTED_VERIFIED") {
    criteria.push(`Reach IMPLEMENTED_VERIFIED: ${e.nextAction}`);
  }
  return criteria;
}

function resolveFlow(e: OsCatalogV1RawEntry): readonly string[] {
  return e.teamId === "svc_social_creative" ? SOCIAL_SERVICE_FLOW : OS_DELIVERABLE_FLOW;
}

function resolveRoles(e: OsCatalogV1RawEntry): string[] {
  return getOsProfessionalTeam(e.teamId as OsTeamId)?.roles.map((r) => r.roleId) ?? [];
}

export const OS_CATALOG_V1: readonly OsCatalogV1Entry[] = OS_CATALOG_V1_RAW.map((e) => ({
  ...e,
  roles: resolveRoles(e),
  flow: resolveFlow(e),
  certificationCriteria: buildCertificationCriteria(e),
}));

export function listOsCatalogV1(): OsCatalogV1Entry[] {
  return [...OS_CATALOG_V1];
}

export function assertOsCatalogV1Integrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (OS_CATALOG_V1_VERSION !== "1.4.0") violations.push("version_mismatch");
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
    if (e.status === "IMPLEMENTED_VERIFIED" && (e.certificationCriteria?.length ?? 0) === 0) {
      violations.push(`verified_without_certification_criteria:${e.serviceId}`);
    }
    if (!e.roles || e.roles.length === 0) violations.push(`no_roles:${e.serviceId}`);
    if (!e.flow || e.flow.length === 0) violations.push(`no_flow:${e.serviceId}`);
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
