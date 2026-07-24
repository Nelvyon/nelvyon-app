/**
 * OS Capability Registry — single map of real agency services across the four agent universes.
 * ADR-033/034: do not mint decorative agents; route by service capability.
 */

export type OsAgentUniverse = "private_ai" | "autonomous" | "os_premium" | "os_sector_legacy";

export type OsServiceId =
  | "seo"
  | "web_landing"
  | "ads"
  | "crm_sales"
  | "email"
  | "automations"
  | "content_social"
  | "reputation"
  | "reporting"
  | "support"
  | "ecommerce"
  | "strategy"
  | "funnel"
  | "retention";

export type OsCapabilityStatus = "elite" | "partial" | "beta" | "planned";

export type OsCapability = {
  serviceId: OsServiceId;
  title: string;
  universes: OsAgentUniverse[];
  /** LLM path for this service's agent work. */
  llmPath: "ollama_first" | "certified_router" | "none";
  playbookPath: string;
  kickoffPackIds: string[];
  portalPath: "/portal";
  qaMinScore: 85;
  ceoApprovalRequired: boolean;
  status: OsCapabilityStatus;
  /** Primary private-ai / premium agent ids (not sector flotilla). */
  primaryAgentIds: string[];
  metricsKeys: string[];
};

export const OS_QA_MIN_SCORE = 85 as const;

/**
 * Canonical agency services (14). Sector flotilla (~1605) is legacy satellite — not listed as primary.
 */
export const OS_CAPABILITY_REGISTRY: readonly OsCapability[] = [
  {
    serviceId: "seo",
    title: "SEO",
    universes: ["autonomous", "private_ai", "os_premium"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_SEO.md",
    kickoffPackIds: ["local-business-growth", "saas-b2b-growth"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "elite",
    primaryAgentIds: ["seo", "NELVYON-SEO"],
    metricsKeys: ["organic_keywords", "qa_score"],
  },
  {
    serviceId: "web_landing",
    title: "Web / Landing",
    universes: ["autonomous", "os_premium"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_WEB_LANDING.md",
    kickoffPackIds: ["local-business-growth", "ecommerce-growth", "saas-b2b-growth"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "elite",
    primaryAgentIds: ["NELVYON-LANDING"],
    metricsKeys: ["deliverables_published", "qa_score"],
  },
  {
    serviceId: "ads",
    title: "Publicidad",
    universes: ["private_ai", "os_premium"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_ADS.md",
    kickoffPackIds: ["ecommerce-growth", "local-business-growth"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: true,
    status: "partial",
    primaryAgentIds: ["google_ads", "meta_ads", "tiktok_ads"],
    metricsKeys: ["campaigns_active", "spend_cents"],
  },
  {
    serviceId: "crm_sales",
    title: "CRM / Ventas",
    universes: ["private_ai"],
    llmPath: "certified_router",
    playbookPath: "docs/agency-playbooks/SERVICE_CRM_SALES.md",
    kickoffPackIds: ["saas-b2b-growth"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "elite",
    primaryAgentIds: ["crm", "sales"],
    metricsKeys: ["pipeline_value", "deals_open"],
  },
  {
    serviceId: "email",
    title: "Email",
    universes: ["private_ai", "autonomous"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_EMAIL.md",
    kickoffPackIds: ["saas-b2b-growth"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: true,
    status: "partial",
    primaryAgentIds: ["email_marketing"],
    metricsKeys: ["campaigns_sent", "open_rate"],
  },
  {
    serviceId: "automations",
    title: "Automatizaciones",
    universes: ["private_ai"],
    llmPath: "certified_router",
    playbookPath: "docs/agency-playbooks/SERVICE_AUTOMATIONS.md",
    kickoffPackIds: [],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: true,
    status: "partial",
    primaryAgentIds: ["workflows", "operations"],
    metricsKeys: ["workflows_active", "runs_24h"],
  },
  {
    serviceId: "content_social",
    title: "Contenidos / Redes",
    universes: ["private_ai", "os_premium"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_CONTENT_SOCIAL.md",
    kickoffPackIds: ["social-calendar-pack", "content-strategy-pack", "brand-voice-pack"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "beta",
    primaryAgentIds: ["content", "social_media", "marketing"],
    metricsKeys: ["posts_scheduled", "qa_score"],
  },
  {
    serviceId: "reputation",
    title: "Reputación",
    universes: ["private_ai"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_REPUTATION.md",
    kickoffPackIds: [],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "partial",
    primaryAgentIds: ["support"],
    metricsKeys: ["reviews_synced", "avg_rating"],
  },
  {
    serviceId: "reporting",
    title: "Reporting",
    universes: ["private_ai"],
    llmPath: "certified_router",
    playbookPath: "docs/agency-playbooks/SERVICE_REPORTING.md",
    kickoffPackIds: ["analytics-setup-pack"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "beta",
    primaryAgentIds: ["reporting"],
    metricsKeys: ["reports_generated"],
  },
  {
    serviceId: "support",
    title: "Soporte / Atención",
    universes: ["private_ai", "autonomous"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_SUPPORT.md",
    kickoffPackIds: ["local-business-growth"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "partial",
    primaryAgentIds: ["support", "NELVYON-CHATBOT", "portal_client"],
    metricsKeys: ["tickets_open", "sla_ok"],
  },
  {
    serviceId: "ecommerce",
    title: "Ecommerce",
    universes: ["autonomous", "os_premium"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_ECOMMERCE.md",
    kickoffPackIds: ["ecommerce-growth", "cro-audit-pack"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "elite",
    primaryAgentIds: ["NELVYON-LANDING", "NELVYON-SEO"],
    metricsKeys: ["orders", "conversion_rate", "qa_score"],
  },
  {
    serviceId: "strategy",
    title: "Strategy OS",
    universes: ["autonomous", "private_ai"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_STRATEGY.md",
    kickoffPackIds: ["strategy-pack"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "elite",
    primaryAgentIds: ["NELVYON-LANDING"],
    metricsKeys: ["strategy_plans_published", "qa_score"],
  },
  {
    serviceId: "funnel",
    title: "Funnel OS",
    universes: ["autonomous", "os_premium"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_FUNNEL.md",
    kickoffPackIds: ["funnel-growth-pack"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "elite",
    primaryAgentIds: ["NELVYON-LANDING", "NELVYON-SEO"],
    metricsKeys: ["funnel_conversion", "qa_score"],
  },
  {
    serviceId: "retention",
    title: "Retention OS",
    universes: ["private_ai", "autonomous"],
    llmPath: "ollama_first",
    playbookPath: "docs/agency-playbooks/SERVICE_RETENTION.md",
    kickoffPackIds: ["retention-pack"],
    portalPath: "/portal",
    qaMinScore: OS_QA_MIN_SCORE,
    ceoApprovalRequired: false,
    status: "elite",
    primaryAgentIds: ["NELVYON-CHATBOT", "email_marketing", "crm"],
    metricsKeys: ["retention_rate", "churn_rate", "qa_score"],
  },
] as const;

export function listOsCapabilities(): readonly OsCapability[] {
  return OS_CAPABILITY_REGISTRY;
}

export function getOsCapability(serviceId: OsServiceId): OsCapability | undefined {
  return OS_CAPABILITY_REGISTRY.find((c) => c.serviceId === serviceId);
}

export function listEliteOsServices(): OsServiceId[] {
  return OS_CAPABILITY_REGISTRY.filter((c) => c.status === "elite").map((c) => c.serviceId);
}

/** Sector flotilla is legacy — never the primary execution path. */
export const OS_SECTOR_FLEET_POLICY = {
  role: "legacy_satellite" as const,
  primaryExecution: "os_capability_registry" as const,
  mintNewSectorAgents: false,
  note: "Do not add decorative sector agents. Extend OS_CAPABILITY_REGISTRY + playbooks instead.",
};

export function assertOsCapabilityRegistryIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const ids = new Set<string>();
  for (const c of OS_CAPABILITY_REGISTRY) {
    if (ids.has(c.serviceId)) violations.push(`duplicate:${c.serviceId}`);
    ids.add(c.serviceId);
    if (c.qaMinScore !== 85) violations.push(`qa_inflated:${c.serviceId}`);
    if (c.portalPath !== "/portal") violations.push(`bad_portal:${c.serviceId}`);
    if (!c.playbookPath.startsWith("docs/agency-playbooks/")) {
      violations.push(`playbook_path:${c.serviceId}`);
    }
  }
  if (OS_CAPABILITY_REGISTRY.length !== 14) {
    violations.push(`expected_14_got_${OS_CAPABILITY_REGISTRY.length}`);
  }
  return { ok: violations.length === 0, violations };
}
