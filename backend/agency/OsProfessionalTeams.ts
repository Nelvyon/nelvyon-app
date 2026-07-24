/**
 * Canonical professional agent teams for NELVYON OS (ADR-051).
 * Roles exist as contracts — not decorative lists. Sector flotilla remains legacy satellite.
 * Does not mint permanent agents; maps to existing Private AI / autonomous / premium IDs.
 */

import { OS_QA_MIN_SCORE } from "./OsCapabilityRegistry";

export type OsTeamId =
  | "global_direction"
  | "global_strategy"
  | "global_qa_elite"
  | "global_competitive_auditor"
  | "global_security_compliance"
  | "global_independent_auditor"
  | "global_ops_success"
  | "svc_strategy_brand"
  | "svc_web_ux_cro"
  | "svc_seo_content"
  | "svc_social_creative"
  | "svc_email_lifecycle"
  | "svc_ads_attribution"
  | "svc_ecommerce_growth"
  | "svc_saas_b2b_growth"
  | "svc_retention_reputation"
  | "svc_automations_crm"
  | "svc_analytics_reporting";

export type OsTeamRole = {
  roleId: string;
  title: string;
  /** Existing agent IDs (Private AI / premium / autonomous role names). */
  mapsToAgentIds: string[];
  responsibilities: string[];
  permissions: string[];
  forbidden: string[];
};

export type OsTeamDefinition = {
  teamId: OsTeamId;
  title: string;
  kind: "global" | "specialist";
  serviceHints: string[];
  roles: OsTeamRole[];
  deliverableTypes: string[];
  qaMinScore: number;
  criticalQaMinScore: number;
  requiresIndependentAuditor: boolean;
  spendRequiresCeo: boolean;
  playbookPath: string;
};

/** Critical deliverables (portal publish, spend-adjacent kits) require higher bar. */
export const OS_CRITICAL_QA_MIN_SCORE = 90 as const;

export const OS_DELIVERABLE_FLOW = [
  "specialist_team",
  "qa_technical_creative_business",
  "competitive_auditor",
  "independent_auditor",
  "client_portal",
  "real_metrics",
  "continuous_improvement",
] as const;

const forbidSpend = [
  "send_mass_campaign",
  "charge_payment",
  "oauth_spend",
  "self_approve_critical",
] as const;

export const OS_PROFESSIONAL_TEAMS: readonly OsTeamDefinition[] = [
  {
    teamId: "global_direction",
    title: "Dirección NELVYON OS",
    kind: "global",
    serviceHints: ["*"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/TEAMS_GLOBAL.md",
    deliverableTypes: ["brief", "plan", "kickoff_authorization"],
    roles: [
      {
        roleId: "ceo_ops",
        title: "CEO operativo",
        mapsToAgentIds: ["ceo_supervisor"],
        responsibilities: ["Priorizar packs", "Aprobar gasto", "Bloquear go-live"],
        permissions: ["observe", "draft", "assisted"],
        forbidden: [...forbidSpend],
      },
      {
        roleId: "account_manager",
        title: "Gestor de cuenta",
        mapsToAgentIds: ["portal_client", "support"],
        responsibilities: ["Brief cliente", "Portal", "Incidencias"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend, "delete_data"],
      },
      {
        roleId: "ops_planner",
        title: "Planificación / operaciones",
        mapsToAgentIds: ["operations", "workflows"],
        responsibilities: ["Dependencias", "SLA", "Rollback"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "global_strategy",
    title: "Estrategia global",
    kind: "global",
    serviceHints: ["strategy"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_STRATEGY.md",
    deliverableTypes: ["icp", "positioning", "90d_plan"],
    roles: [
      {
        roleId: "market_strategist",
        title: "Estratega de mercado",
        mapsToAgentIds: ["marketing", "NELVYON-LANDING"],
        responsibilities: ["ICP", "competencia", "posicionamiento"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "global_qa_elite",
    title: "QA élite central",
    kind: "global",
    serviceHints: ["*"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: false,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/TEAMS_QA_ELITE.md",
    deliverableTypes: ["qa_report", "rejection", "repair_plan"],
    roles: [
      {
        roleId: "qa_technical",
        title: "QA técnico",
        mapsToAgentIds: ["qa"],
        responsibilities: ["Links", "móvil", "tracking", "errores técnicos"],
        permissions: ["observe", "draft"],
        forbidden: ["self_approve_critical", ...forbidSpend],
      },
      {
        roleId: "qa_creative_brand",
        title: "QA creativo / marca",
        mapsToAgentIds: ["branding_premium", "contenido_copywriting_premium"],
        responsibilities: ["Marca", "copy", "coherencia visual"],
        permissions: ["observe", "draft"],
        forbidden: ["self_approve_critical", ...forbidSpend],
      },
      {
        roleId: "qa_business_data",
        title: "QA negocio / datos",
        mapsToAgentIds: ["reporting"],
        responsibilities: ["Claims", "métricas", "fact-check"],
        permissions: ["observe", "draft"],
        forbidden: ["self_approve_critical", ...forbidSpend],
      },
    ],
  },
  {
    teamId: "global_competitive_auditor",
    title: "Auditor competitivo",
    kind: "global",
    serviceHints: ["*"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: false,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/TEAMS_QA_ELITE.md",
    deliverableTypes: ["competitive_benchmark"],
    roles: [
      {
        roleId: "competitive_auditor",
        title: "Auditor de nicho",
        mapsToAgentIds: ["marketing", "seo"],
        responsibilities: ["Comparar vs referentes del sector", "Gaps"],
        permissions: ["observe", "draft"],
        forbidden: ["self_approve_critical", ...forbidSpend],
      },
    ],
  },
  {
    teamId: "global_security_compliance",
    title: "Seguridad / compliance",
    kind: "global",
    serviceHints: ["*"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/TEAMS_QA_ELITE.md",
    deliverableTypes: ["compliance_check"],
    roles: [
      {
        roleId: "security_compliance",
        title: "Security / privacy",
        mapsToAgentIds: ["security_compliance"],
        responsibilities: ["Permisos", "privacidad", "deliverability", "trazabilidad"],
        permissions: ["observe", "draft", "assisted"],
        forbidden: [...forbidSpend, "rotate_credentials"],
      },
    ],
  },
  {
    teamId: "global_independent_auditor",
    title: "Auditor independiente",
    kind: "global",
    serviceHints: ["*"],
    qaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/TEAMS_QA_ELITE.md",
    deliverableTypes: ["audit_block", "audit_pass"],
    roles: [
      {
        roleId: "independent_auditor",
        title: "Auditor independiente",
        mapsToAgentIds: ["security_compliance", "qa"],
        responsibilities: ["Bloquear críticos", "No auto-aprobar productores"],
        permissions: ["observe"],
        forbidden: ["produce_deliverable", "self_approve_critical", ...forbidSpend],
      },
    ],
  },
  {
    teamId: "global_ops_success",
    title: "Operaciones y éxito de cliente",
    kind: "global",
    serviceHints: ["support", "reporting"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: false,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/TEAMS_GLOBAL.md",
    deliverableTypes: ["portal_version", "incident", "metrics_snapshot"],
    roles: [
      {
        roleId: "cs_ops",
        title: "Éxito de cliente",
        mapsToAgentIds: ["portal_client", "support", "reporting"],
        responsibilities: ["Portal", "versiones", "evidencia", "mejora continua"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_strategy_brand",
    title: "Estrategia + branding",
    kind: "specialist",
    serviceHints: ["strategy", "content_social"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_STRATEGY.md",
    deliverableTypes: ["brand_voice", "strategy_plan"],
    roles: [
      {
        roleId: "brand_strategist",
        title: "Brand / strategy",
        mapsToAgentIds: ["branding_premium", "marketing"],
        responsibilities: ["Voz", "posicionamiento", "mensajes"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_web_ux_cro",
    title: "Web / UX / landing / funnel / CRO",
    kind: "specialist",
    serviceHints: ["web_landing", "funnel", "ecommerce"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_WEB_LANDING.md",
    deliverableTypes: ["landing", "funnel_map", "cro_audit"],
    roles: [
      {
        roleId: "landing_pm",
        title: "PM landing",
        mapsToAgentIds: ["NELVYON-LANDING", "landing_premium", "funnel_premium"],
        responsibilities: ["Landing", "CRO", "funnel steps"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_seo_content",
    title: "SEO + contenidos + fact-check",
    kind: "specialist",
    serviceHints: ["seo"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_SEO.md",
    deliverableTypes: ["seo_report", "editorial_plan"],
    roles: [
      {
        roleId: "seo_lead",
        title: "SEO lead",
        mapsToAgentIds: ["seo", "NELVYON-SEO", "seo_premium"],
        responsibilities: ["Técnico", "local", "keywords", "fact-check"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_social_creative",
    title: "Social + creatividad + vídeo (estrategia)",
    kind: "specialist",
    serviceHints: ["content_social"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_CONTENT_SOCIAL.md",
    deliverableTypes: ["social_calendar", "storyboard", "script"],
    roles: [
      {
        roleId: "social_lead",
        title: "Social / creative lead",
        mapsToAgentIds: ["social_media", "social_media_premium", "content"],
        responsibilities: ["Calendario", "guion", "storyboard", "QA creativo"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend, "paid_render_without_approval"],
      },
    ],
  },
  {
    teamId: "svc_email_lifecycle",
    title: "Email / lifecycle / deliverability",
    kind: "specialist",
    serviceHints: ["email"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_EMAIL.md",
    deliverableTypes: ["email_sequence", "deliverability_checklist"],
    roles: [
      {
        roleId: "email_lead",
        title: "Email lifecycle",
        mapsToAgentIds: ["email_marketing", "email_marketing_premium"],
        responsibilities: ["Secuencias", "segmentación", "deliverability"],
        permissions: ["draft", "assisted"],
        forbidden: ["send_mass_campaign", ...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_ads_attribution",
    title: "Publicidad / atribución",
    kind: "specialist",
    serviceHints: ["ads"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_ADS.md",
    deliverableTypes: ["ads_kit", "attribution_plan"],
    roles: [
      {
        roleId: "ads_lead",
        title: "Ads lead",
        mapsToAgentIds: ["google_ads", "meta_ads", "ads_premium"],
        responsibilities: ["Kits creativos", "plan media OFF hasta OAuth"],
        permissions: ["draft"],
        forbidden: ["oauth_spend", "charge_payment", "send_mass_campaign"],
      },
    ],
  },
  {
    teamId: "svc_ecommerce_growth",
    title: "Ecommerce growth",
    kind: "specialist",
    serviceHints: ["ecommerce"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_ECOMMERCE.md",
    deliverableTypes: ["ecommerce_pack"],
    roles: [
      {
        roleId: "ecom_lead",
        title: "Ecommerce lead",
        mapsToAgentIds: ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
        responsibilities: ["Pack ecommerce certificado"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_saas_b2b_growth",
    title: "SaaS / B2B growth",
    kind: "specialist",
    serviceHints: ["crm_sales"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_CRM_SALES.md",
    deliverableTypes: ["saas_b2b_pack", "outbound_playbook"],
    roles: [
      {
        roleId: "b2b_lead",
        title: "B2B growth lead",
        mapsToAgentIds: ["crm", "sales", "NELVYON-LANDING"],
        responsibilities: ["ICP", "demo bot", "outbound"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_retention_reputation",
    title: "Retención / reputación / PR",
    kind: "specialist",
    serviceHints: ["retention", "reputation"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_RETENTION.md",
    deliverableTypes: ["retention_sequence", "reputation_report"],
    roles: [
      {
        roleId: "retention_lead",
        title: "Retention / reputation",
        mapsToAgentIds: ["NELVYON-CHATBOT", "support", "email_marketing"],
        responsibilities: ["Churn rules", "reviews sync preparado"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_automations_crm",
    title: "Automatizaciones / CRM / chatbots / soporte",
    kind: "specialist",
    serviceHints: ["automations", "crm_sales", "support"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_AUTOMATIONS.md",
    deliverableTypes: ["workflow", "chatbot", "crm_playbook"],
    roles: [
      {
        roleId: "automation_lead",
        title: "Automations / CRM",
        mapsToAgentIds: ["workflows", "operations", "NELVYON-CHATBOT", "crm"],
        responsibilities: ["Workflows", "bots", "integraciones"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend],
      },
    ],
  },
  {
    teamId: "svc_analytics_reporting",
    title: "Analítica / reporting",
    kind: "specialist",
    serviceHints: ["reporting"],
    qaMinScore: OS_QA_MIN_SCORE,
    criticalQaMinScore: OS_CRITICAL_QA_MIN_SCORE,
    requiresIndependentAuditor: true,
    spendRequiresCeo: true,
    playbookPath: "docs/agency-playbooks/SERVICE_REPORTING.md",
    deliverableTypes: ["analytics_setup", "executive_dashboard"],
    roles: [
      {
        roleId: "analytics_lead",
        title: "Analytics lead",
        mapsToAgentIds: ["reporting"],
        responsibilities: ["GA4/GSC", "dashboard", "sin Matomo/Umami (ADR-048)"],
        permissions: ["draft", "assisted"],
        forbidden: [...forbidSpend, "install_external_analytics"],
      },
    ],
  },
] as const;

export function listOsProfessionalTeams(): readonly OsTeamDefinition[] {
  return OS_PROFESSIONAL_TEAMS;
}

export function getOsProfessionalTeam(teamId: OsTeamId): OsTeamDefinition | undefined {
  return OS_PROFESSIONAL_TEAMS.find((t) => t.teamId === teamId);
}

export function listTeamsForService(serviceHint: string): OsTeamDefinition[] {
  return OS_PROFESSIONAL_TEAMS.filter(
    (t) => t.serviceHints.includes("*") || t.serviceHints.includes(serviceHint),
  );
}

export function assertOsProfessionalTeamsIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const ids = new Set<string>();
  for (const t of OS_PROFESSIONAL_TEAMS) {
    if (ids.has(t.teamId)) violations.push(`duplicate_team:${t.teamId}`);
    ids.add(t.teamId);
    if (t.qaMinScore < OS_QA_MIN_SCORE) violations.push(`qa_below_min:${t.teamId}`);
    if (t.criticalQaMinScore < t.qaMinScore) violations.push(`critical_lt_min:${t.teamId}`);
    if (!t.roles.length) violations.push(`no_roles:${t.teamId}`);
    for (const r of t.roles) {
      if (!r.mapsToAgentIds.length) violations.push(`no_agent_map:${t.teamId}/${r.roleId}`);
      if (r.forbidden.includes("self_approve_critical") === false && t.teamId.includes("auditor")) {
        /* independent auditor must forbid self-approve — checked below */
      }
    }
  }
  const auditor = getOsProfessionalTeam("global_independent_auditor");
  if (!auditor?.roles.every((r) => r.forbidden.includes("self_approve_critical"))) {
    violations.push("independent_auditor_must_forbid_self_approve");
  }
  if (OS_PROFESSIONAL_TEAMS.length < 15) {
    violations.push(`expected_gte_15_got_${OS_PROFESSIONAL_TEAMS.length}`);
  }
  return { ok: violations.length === 0, violations };
}
