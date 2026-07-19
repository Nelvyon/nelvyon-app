/**
 * Workforce hierarchy + lifecycle — ADR-027.
 * Does not mint new permanent agents; metadata over existing Unified Registry IDs.
 */

export type AgentLifecycleState =
  | "draft"
  | "sandbox"
  | "evaluated"
  | "certified"
  | "production"
  | "suspended"
  | "deprecated";

export type AgentHierarchyLevel = "L1_executive" | "L2_domain" | "L3_specialist" | "ephemeral_worker";

export type OperationMode = "observe" | "draft" | "assisted" | "autonomous" | "emergency_stop";

/** Canonical ID aliases — deprecated IDs resolve to canonical (ADR-027). */
export const AGENT_ID_ALIASES: Readonly<Record<string, string>> = {
  sem_google_ads: "google_ads",
  automation: "workflows",
  analytics: "reporting",
  security: "security_compliance",
};

export function resolveCanonicalAgentId(id: string): string {
  return AGENT_ID_ALIASES[id] ?? id;
}

export function isDeprecatedAgentId(id: string): boolean {
  return id in AGENT_ID_ALIASES;
}

export type WorkforceAgentProfile = {
  agentId: string;
  level: AgentHierarchyLevel;
  reportsTo: string | null;
  lifecycle: AgentLifecycleState;
  operationModesAllowed: OperationMode[];
  /** Interim runtime cover when design-only */
  interimRuntimeId?: string;
  owner: string;
};

/**
 * Hierarchy overlay for existing IDs only.
 * Design-only L1 seats use interimRuntimeId until promoted with evals/tools.
 */
export const WORKFORCE_HIERARCHY: WorkforceAgentProfile[] = [
  {
    agentId: "ceo_supervisor",
    level: "L1_executive",
    reportsTo: null,
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "platform",
  },
  {
    agentId: "cto",
    level: "L1_executive",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "engineering",
  },
  {
    agentId: "marketing",
    level: "L1_executive",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "growth",
  },
  {
    agentId: "sales",
    level: "L1_executive",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "revenue",
  },
  {
    agentId: "finance",
    level: "L1_executive",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "finance",
  },
  {
    agentId: "security_compliance",
    level: "L1_executive",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "security",
  },
  {
    agentId: "operations",
    level: "L1_executive",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "ops",
  },
  {
    agentId: "product",
    level: "L1_executive",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "product",
  },
  {
    agentId: "support",
    level: "L1_executive",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "customer",
  },
  // L2 domain leads (runtime)
  {
    agentId: "seo",
    level: "L2_domain",
    reportsTo: "marketing",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "growth",
  },
  {
    agentId: "google_ads",
    level: "L2_domain",
    reportsTo: "marketing",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft"],
    owner: "growth",
  },
  {
    agentId: "meta_ads",
    level: "L2_domain",
    reportsTo: "marketing",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft"],
    owner: "growth",
  },
  {
    agentId: "tiktok_ads",
    level: "L2_domain",
    reportsTo: "marketing",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft"],
    owner: "growth",
  },
  {
    agentId: "email_marketing",
    level: "L2_domain",
    reportsTo: "marketing",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "growth",
  },
  {
    agentId: "content",
    level: "L2_domain",
    reportsTo: "marketing",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "growth",
  },
  {
    agentId: "crm",
    level: "L2_domain",
    reportsTo: "sales",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "revenue",
  },
  {
    agentId: "portal_client",
    level: "L2_domain",
    reportsTo: "support",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "customer",
  },
  {
    agentId: "reporting",
    level: "L2_domain",
    reportsTo: "ceo_supervisor",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "data",
  },
  {
    agentId: "workflows",
    level: "L2_domain",
    reportsTo: "operations",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "ops",
  },
  {
    agentId: "development",
    level: "L2_domain",
    reportsTo: "cto",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "engineering",
  },
  {
    agentId: "qa",
    level: "L2_domain",
    reportsTo: "cto",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "engineering",
  },
  {
    agentId: "devops",
    level: "L2_domain",
    reportsTo: "cto",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "engineering",
  },
  {
    agentId: "social_media",
    level: "L2_domain",
    reportsTo: "marketing",
    lifecycle: "evaluated",
    operationModesAllowed: ["observe", "draft", "assisted"],
    owner: "growth",
  },
];

/** Design-only IDs kept out of permanent runtime — ephemeral workers only (ADR-027). */
export const EPHEMERAL_ONLY_DESIGN_IDS = ["design", "video", "image", "documentation"] as const;

/** Deprecated design IDs — still listed for redirect, lifecycle=deprecated */
export const DEPRECATED_WORKFORCE_IDS = Object.keys(AGENT_ID_ALIASES);

export function getWorkforceProfile(agentId: string): WorkforceAgentProfile | null {
  const canonical = resolveCanonicalAgentId(agentId);
  return WORKFORCE_HIERARCHY.find((p) => p.agentId === canonical) ?? null;
}

export function listWorkforceByLevel(level: AgentHierarchyLevel): WorkforceAgentProfile[] {
  return WORKFORCE_HIERARCHY.filter((p) => p.level === level);
}

export function effectiveRuntimeAgentId(agentId: string): string {
  const canonical = resolveCanonicalAgentId(agentId);
  const profile = getWorkforceProfile(canonical);
  return profile?.interimRuntimeId ?? canonical;
}

/** Never mark certified without eval evidence — helper for gates. */
export function assertNotFalselyCertified(lifecycle: AgentLifecycleState, hasEvalEvidence: boolean): boolean {
  if (lifecycle === "certified" || lifecycle === "production") return hasEvalEvidence;
  return true;
}
