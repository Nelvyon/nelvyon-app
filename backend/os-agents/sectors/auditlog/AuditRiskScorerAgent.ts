import type { ILlmClient } from "../../LlmClient";
import type { AuditLogInput, AuditLogOutput } from "./shared";
import { getDefaultAuditLogLlm, runAuditLogAgentCore } from "./shared";

const AGENT_ID = "audit-risk-scorer";

export class AuditRiskScorerAgent {
  private static inst: AuditRiskScorerAgent | undefined;

  static get instance(): AuditRiskScorerAgent {
    if (!AuditRiskScorerAgent.inst) AuditRiskScorerAgent.inst = new AuditRiskScorerAgent();
    return AuditRiskScorerAgent.inst;
  }

  static reset(): void {
    AuditRiskScorerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAuditLogLlm();
  }

  async run(input: AuditLogInput): Promise<AuditLogOutput> {
    return runAuditLogAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Quant risk top 1%; score 0-100 interpretable por soporte.",
        mission:
          "Calcula riskScore coherente con tipo de acción, datos sensibles en metadata y superficie de abuso.",
        fewShotExample:
          '{"summary":"API_KEY_CREATED en prod — riesgo medio-alto si sin IP allowlist","riskScore":63,"anomalyDetected":false,"anomalyReason":""}',
      },
      input,
    );
  }
}

export function getAuditRiskScorerAgent(): AuditRiskScorerAgent {
  return AuditRiskScorerAgent.instance;
}

export function resetAuditRiskScorerAgentForTests(): void {
  AuditRiskScorerAgent.reset();
}
