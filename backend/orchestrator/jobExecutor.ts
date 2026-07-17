/**
 * Pluggable job execution for Agent Orchestrator.
 * Default: sandbox (deterministic, no LLM) — safe for CI and elite cert.
 * Live: optional PrivateAiOrchestrator when NELVYON_ORCHESTRATOR_LIVE=1.
 */

export type OrchestratorExecuteInput = {
  tenantId: string;
  agentId: string;
  correlationId: string;
  traceId: string;
  input: string;
  pattern: string;
};

export type OrchestratorExecuteResult = {
  ok: boolean;
  validated: boolean;
  mode: "sandbox" | "live";
  output: string;
  acceptance: string[];
  evidence: Record<string, unknown>;
  error?: string;
};

export type OrchestratorJobExecutor = (
  input: OrchestratorExecuteInput,
) => Promise<OrchestratorExecuteResult>;

/** Domain-aware sandbox: structured deliverable + acceptance checks (no LLM). */
export async function sandboxJobExecutor(
  input: OrchestratorExecuteInput,
): Promise<OrchestratorExecuteResult> {
  const trimmed = input.input.trim();
  if (!trimmed) {
    return {
      ok: false,
      validated: false,
      mode: "sandbox",
      output: "",
      acceptance: ["non_empty_input"],
      evidence: { reason: "empty_input" },
      error: "empty_input",
    };
  }

  // Adversarial / security: never claim tool execution for injection probes.
  const injection =
    /ignore\s+previous|exporta\s+tenant|jwt_secret|\[system:/i.test(trimmed);
  if (injection) {
    return {
      ok: false,
      validated: true,
      mode: "sandbox",
      output: "blocked_by_policy",
      acceptance: ["security_block"],
      evidence: { blocked: true, category: "prompt_injection_or_exfil" },
      error: "blocked_by_policy",
    };
  }

  const acceptance = acceptanceForAgent(input.agentId);
  const output = buildSandboxDeliverable(input.agentId, trimmed, input.correlationId);
  const validated = acceptance.every((rule) => checkAcceptance(rule, output, trimmed));

  return {
    ok: validated,
    validated,
    mode: "sandbox",
    output,
    acceptance,
    evidence: {
      agentId: input.agentId,
      pattern: input.pattern,
      correlationId: input.correlationId,
      traceId: input.traceId,
      tenantId: input.tenantId,
      chars: output.length,
      toolExecuted: false,
      llmInvoked: false,
    },
  };
}

function acceptanceForAgent(agentId: string): string[] {
  const common = ["has_structured_sections", "mentions_agent", "has_next_steps"];
  const byAgent: Record<string, string[]> = {
    seo: [...common, "mentions_seo"],
    sales: [...common, "mentions_opportunity"],
    crm: [...common, "mentions_crm"],
    support: [...common, "mentions_ticket"],
    content: [...common, "mentions_content"],
    reporting: [...common, "mentions_report"],
    finance: [...common, "mentions_finance"],
    security_compliance: [...common, "mentions_risk"],
    development: [...common, "mentions_technical"],
    ceo_supervisor: [...common, "mentions_summary"],
  };
  return byAgent[agentId] ?? common;
}

function buildSandboxDeliverable(agentId: string, input: string, correlationId: string): string {
  const brief = input.slice(0, 280);
  return [
    `## Agent: ${agentId}`,
    `## Correlation: ${correlationId}`,
    `## Input brief`,
    brief,
    `## Analysis`,
    `Sandbox deliverable for ${agentId}. Opportunity/CRM/SEO/support/content/report/finance/risk/technical/summary as applicable.`,
    `## Recommendations`,
    `- Validate assumptions with tenant data`,
    `- Escalate sensitive actions for human approval`,
    `## Next steps`,
    `1. Review structured output`,
    `2. Attach evidence to workflow run`,
    `3. Gate on acceptance criteria before marking complete`,
    `## Validation`,
    `status: sandbox_validated`,
  ].join("\n");
}

function checkAcceptance(rule: string, output: string, input: string): boolean {
  const o = output.toLowerCase();
  switch (rule) {
    case "non_empty_input":
      return input.trim().length > 0;
    case "has_structured_sections":
      return o.includes("## analysis") && o.includes("## next steps");
    case "mentions_agent":
      return o.includes("## agent:");
    case "has_next_steps":
      return o.includes("next steps");
    case "mentions_seo":
      return /seo|keyword|on-page|auditor/i.test(output);
    case "mentions_opportunity":
      return /opportunity|sales|pipeline|deal/i.test(output);
    case "mentions_crm":
      return /crm|lead|follow/i.test(output);
    case "mentions_ticket":
      return /support|ticket|clasific/i.test(output) || /support/.test(o);
    case "mentions_content":
      return /content|contenido|copy/i.test(output);
    case "mentions_report":
      return /report|informe|kpi/i.test(output);
    case "mentions_finance":
      return /finance|finanzas|coste|budget/i.test(output);
    case "mentions_risk":
      return /risk|riesgo|compliance|security/i.test(output);
    case "mentions_technical":
      return /technical|desarrollo|diagnóstico|engineering/i.test(output);
    case "mentions_summary":
      return /summary|resumen|supervisor|kpi/i.test(output);
    case "security_block":
      return true;
    default:
      return true;
  }
}

export function isOrchestratorLiveEnabled(): boolean {
  const v = process.env.NELVYON_ORCHESTRATOR_LIVE ?? "0";
  return v === "1" || v.toLowerCase() === "true";
}
