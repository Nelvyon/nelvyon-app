/**
 * Enterprise workflow definitions — sandbox-certifiable end-to-end plans.
 * Uses Orchestrator + deterministic sandbox executor (no paid LLM required).
 */

export type EnterpriseWorkflowId =
  | "commercial_opportunity"
  | "proposal_prep"
  | "crm_followup"
  | "campaign_plan"
  | "seo_audit"
  | "content_review"
  | "support_triage"
  | "ops_analysis"
  | "tech_diagnosis"
  | "executive_report";

export type EnterpriseWorkflowDef = {
  id: EnterpriseWorkflowId;
  name: string;
  agents: string[];
  pattern: "sequential" | "parallel_fanout" | "pipeline" | "supervisor_worker";
  acceptance: string[];
  slo: { maxLatencyMs: number; minSuccessRate: number };
  tools: string[];
  requiresApproval: boolean;
};

export const ENTERPRISE_WORKFLOWS: EnterpriseWorkflowDef[] = [
  {
    id: "commercial_opportunity",
    name: "Análisis de oportunidad comercial",
    agents: ["sales", "crm", "ceo_supervisor"],
    pattern: "pipeline",
    acceptance: ["has_structured_sections", "mentions_opportunity"],
    slo: { maxLatencyMs: 15_000, minSuccessRate: 0.95 },
    tools: ["rag.search", "memory.read", "crm.read"],
    requiresApproval: false,
  },
  {
    id: "proposal_prep",
    name: "Preparación de propuesta",
    agents: ["sales", "content", "finance", "ceo_supervisor"],
    pattern: "pipeline",
    acceptance: ["has_structured_sections", "has_next_steps"],
    slo: { maxLatencyMs: 20_000, minSuccessRate: 0.9 },
    tools: ["rag.search", "memory.read", "reports.read"],
    requiresApproval: true,
  },
  {
    id: "crm_followup",
    name: "Seguimiento CRM",
    agents: ["crm", "sales"],
    pattern: "sequential",
    acceptance: ["mentions_crm", "has_next_steps"],
    slo: { maxLatencyMs: 10_000, minSuccessRate: 0.95 },
    tools: ["crm.read", "memory.write"],
    requiresApproval: false,
  },
  {
    id: "campaign_plan",
    name: "Planificación de campaña",
    agents: ["email_marketing", "content", "seo", "ceo_supervisor"],
    pattern: "parallel_fanout",
    acceptance: ["has_structured_sections"],
    slo: { maxLatencyMs: 20_000, minSuccessRate: 0.9 },
    tools: ["campaigns.draft", "rag.search"],
    requiresApproval: true,
  },
  {
    id: "seo_audit",
    name: "Auditoría SEO",
    agents: ["seo", "reporting"],
    pattern: "sequential",
    acceptance: ["mentions_seo", "has_next_steps"],
    slo: { maxLatencyMs: 12_000, minSuccessRate: 0.95 },
    tools: ["rag.search", "reports.read"],
    requiresApproval: false,
  },
  {
    id: "content_review",
    name: "Producción y revisión de contenido",
    agents: ["content", "seo", "qa"],
    pattern: "pipeline",
    acceptance: ["mentions_content", "has_next_steps"],
    slo: { maxLatencyMs: 15_000, minSuccessRate: 0.9 },
    tools: ["rag.search", "memory.read"],
    requiresApproval: true,
  },
  {
    id: "support_triage",
    name: "Clasificación y respuesta de soporte",
    agents: ["support", "crm"],
    pattern: "sequential",
    acceptance: ["mentions_ticket", "has_next_steps"],
    slo: { maxLatencyMs: 8_000, minSuccessRate: 0.95 },
    tools: ["memory.read", "crm.read"],
    requiresApproval: false,
  },
  {
    id: "ops_analysis",
    name: "Análisis operativo",
    agents: ["workflows", "reporting", "ceo_supervisor"],
    pattern: "pipeline",
    acceptance: ["has_structured_sections", "mentions_summary"],
    slo: { maxLatencyMs: 15_000, minSuccessRate: 0.9 },
    tools: ["reports.read", "memory.read"],
    requiresApproval: false,
  },
  {
    id: "tech_diagnosis",
    name: "Diagnóstico técnico",
    agents: ["development", "qa", "security_compliance"],
    pattern: "parallel_fanout",
    acceptance: ["mentions_technical", "mentions_risk"],
    slo: { maxLatencyMs: 15_000, minSuccessRate: 0.9 },
    tools: ["rag.search", "reports.read"],
    requiresApproval: false,
  },
  {
    id: "executive_report",
    name: "Informe ejecutivo",
    agents: ["reporting", "finance", "ceo_supervisor"],
    pattern: "pipeline",
    acceptance: ["mentions_report", "mentions_summary"],
    slo: { maxLatencyMs: 15_000, minSuccessRate: 0.95 },
    tools: ["reports.read", "rag.search", "memory.read"],
    requiresApproval: false,
  },
];

export function getEnterpriseWorkflow(id: string): EnterpriseWorkflowDef | undefined {
  return ENTERPRISE_WORKFLOWS.find((w) => w.id === id);
}

export function listEnterpriseWorkflowIds(): EnterpriseWorkflowId[] {
  return ENTERPRISE_WORKFLOWS.map((w) => w.id);
}
