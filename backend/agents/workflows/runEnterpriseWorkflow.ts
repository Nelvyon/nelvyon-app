/**
 * Run enterprise workflows against the in-process orchestrator (sandbox by default).
 */

import {
  ENTERPRISE_WORKFLOWS,
  getEnterpriseWorkflow,
  type EnterpriseWorkflowId,
} from "./enterpriseWorkflows";
import {
  InMemoryAgentOrchestrator,
  getAgentOrchestrator,
} from "../../orchestrator/runtime";
import { isOrchestratorEnabled } from "../../orchestrator/contracts";

export type WorkflowRunResult = {
  workflowId: string;
  correlationId: string;
  ok: boolean;
  latencyMs: number;
  jobStates: Array<{ agentId: string; state: string; validated?: boolean }>;
  sloMet: boolean;
  errors: string[];
};

export async function runEnterpriseWorkflow(
  tenantId: string,
  workflowId: EnterpriseWorkflowId,
  input: string,
  orch?: InMemoryAgentOrchestrator,
): Promise<WorkflowRunResult> {
  const def = getEnterpriseWorkflow(workflowId);
  if (!def) {
    return {
      workflowId,
      correlationId: "",
      ok: false,
      latencyMs: 0,
      jobStates: [],
      sloMet: false,
      errors: ["unknown_workflow"],
    };
  }

  if (!orch && !isOrchestratorEnabled()) {
    return {
      workflowId,
      correlationId: "",
      ok: false,
      latencyMs: 0,
      jobStates: [],
      sloMet: false,
      errors: ["orchestrator_disabled"],
    };
  }

  const runner = orch ?? (getAgentOrchestrator() as InMemoryAgentOrchestrator);
  const started = Date.now();
  const correlationId = await runner.coordinate(
    tenantId,
    {
      pattern: def.pattern,
      agents: def.agents,
      timeoutMs: def.slo.maxLatencyMs,
      requireAllSuccess: true,
    },
    input,
  );
  const latencyMs = Date.now() - started;
  const jobs = runner.listJobs(tenantId).filter((j) => j.correlationId === correlationId);
  const jobStates = jobs.map((j) => ({
    agentId: j.agentId,
    state: j.state,
    validated: Boolean(j.payload.validated),
  }));
  const errors = jobs
    .filter((j) => j.state !== "succeeded")
    .map((j) => j.lastError ?? `${j.agentId}:${j.state}`);
  const ok = errors.length === 0 && jobs.length === def.agents.length;
  const sloMet = ok && latencyMs <= def.slo.maxLatencyMs;

  return {
    workflowId,
    correlationId,
    ok,
    latencyMs,
    jobStates,
    sloMet,
    errors,
  };
}

export async function runAllEnterpriseWorkflows(
  tenantId = "wf-cert-tenant",
): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: WorkflowRunResult[];
}> {
  const orch = new InMemoryAgentOrchestrator();
  const results: WorkflowRunResult[] = [];
  for (const wf of ENTERPRISE_WORKFLOWS) {
    const sample = sampleInputFor(wf.id);
    results.push(await runEnterpriseWorkflow(tenantId, wf.id, sample, orch));
  }
  const passed = results.filter((r) => r.ok && r.sloMet).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

function sampleInputFor(id: string): string {
  const map: Record<string, string> = {
    commercial_opportunity:
      "Oportunidad retail B2B ticket 12k. Analiza fit y next steps de sales/CRM.",
    proposal_prep: "Preparar propuesta comercial para SaaS onboarding pack. Incluir coste y contenido.",
    crm_followup: "Seguimiento CRM lead frío 14 días sin respuesta. Propón secuencia.",
    campaign_plan: "Plan de campaña email + SEO + contenido para lanzamiento Q3.",
    seo_audit: "Auditoría SEO landing /demos: title, H1, keywords, technical SEO.",
    content_review: "Producir y revisar contenido blog SEO sobre private AI B2B.",
    support_triage: "Ticket soporte: cliente no recibe emails de campaña. Clasifica y responde.",
    ops_analysis: "Análisis operativo: workflows fallidos 3%, latencia p95 alta.",
    tech_diagnosis: "Diagnóstico técnico: MCP timeout y riesgo de permisos en tool write.",
    executive_report: "Informe ejecutivo mensual: pipeline, costes, KPIs de agentes.",
  };
  return map[id] ?? `Workflow ${id} enterprise sample`;
}
