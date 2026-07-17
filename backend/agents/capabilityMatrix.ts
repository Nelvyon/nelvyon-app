/**
 * Capability matrix — honest inventory of Private AI runtime agents.
 * runtimeReady ≠ elite certified. Elite requires eval thresholds + workflow SLO.
 */

export type AgentCapabilityRow = {
  id: string;
  domain: string;
  runtimeReady: boolean;
  tools: string[];
  memory: boolean;
  rag: boolean;
  evalCovered: boolean;
  workflowCovered: boolean;
  notes: string;
};

/** SSOT snapshot for docs / panel — keep in sync with nelvyonAgentRegistry + eval suite. */
export const AGENT_CAPABILITY_MATRIX: AgentCapabilityRow[] = [
  { id: "ceo_supervisor", domain: "direction", runtimeReady: true, tools: ["memory", "rag", "reports"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Supervisor; no auto-exec sensitive" },
  { id: "sales", domain: "sales", runtimeReady: true, tools: ["crm", "memory", "rag"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Opportunity analysis" },
  { id: "crm", domain: "crm", runtimeReady: true, tools: ["crm", "memory"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Follow-up sequences" },
  { id: "support", domain: "support", runtimeReady: true, tools: ["memory", "crm"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Triage" },
  { id: "seo", domain: "seo", runtimeReady: true, tools: ["rag", "reports"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "On-page audit" },
  { id: "google_ads", domain: "ads", runtimeReady: true, tools: ["reports"], memory: true, rag: true, evalCovered: false, workflowCovered: false, notes: "Design tools; sandbox not in elite 10" },
  { id: "meta_ads", domain: "ads", runtimeReady: true, tools: ["reports"], memory: true, rag: true, evalCovered: false, workflowCovered: false, notes: "Same" },
  { id: "tiktok_ads", domain: "ads", runtimeReady: true, tools: ["reports"], memory: true, rag: true, evalCovered: false, workflowCovered: false, notes: "Same" },
  { id: "email_marketing", domain: "email", runtimeReady: true, tools: ["campaigns"], memory: true, rag: true, evalCovered: false, workflowCovered: true, notes: "In campaign_plan workflow" },
  { id: "content", domain: "content", runtimeReady: true, tools: ["rag", "memory"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Draft + review" },
  { id: "workflows", domain: "ops", runtimeReady: true, tools: ["reports"], memory: true, rag: true, evalCovered: false, workflowCovered: true, notes: "Ops analysis" },
  { id: "reporting", domain: "analytics", runtimeReady: true, tools: ["reports", "rag"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Executive reports" },
  { id: "development", domain: "engineering", runtimeReady: true, tools: ["rag"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Tech diagnosis" },
  { id: "qa", domain: "quality", runtimeReady: true, tools: ["reports"], memory: true, rag: true, evalCovered: false, workflowCovered: true, notes: "Content/tech review" },
  { id: "finance", domain: "finance", runtimeReady: true, tools: ["reports"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Cost in proposals" },
  { id: "portal_client", domain: "cs", runtimeReady: true, tools: ["memory"], memory: true, rag: true, evalCovered: false, workflowCovered: false, notes: "Portal advise; no elite workflow yet" },
  { id: "security_compliance", domain: "compliance", runtimeReady: true, tools: ["audit", "rag"], memory: true, rag: true, evalCovered: true, workflowCovered: true, notes: "Risk + adversarial eval" },
];

export function capabilityMatrixSummary() {
  const total = AGENT_CAPABILITY_MATRIX.length;
  const evalCovered = AGENT_CAPABILITY_MATRIX.filter((r) => r.evalCovered).length;
  const workflowCovered = AGENT_CAPABILITY_MATRIX.filter((r) => r.workflowCovered).length;
  return { total, evalCovered, workflowCovered, runtimeReady: total };
}
