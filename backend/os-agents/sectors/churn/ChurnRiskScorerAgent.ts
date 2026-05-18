import type { ILlmClient } from "../../LlmClient";
import type { ChurnInput, ChurnOutput } from "./shared";
import { getDefaultChurnLlm, runChurnAgentCore } from "./shared";

const AGENT_ID = "churn-risk-scorer";

export class ChurnRiskScorerAgent {
  private static inst: ChurnRiskScorerAgent | undefined;

  static get instance(): ChurnRiskScorerAgent {
    if (!ChurnRiskScorerAgent.inst) ChurnRiskScorerAgent.inst = new ChurnRiskScorerAgent();
    return ChurnRiskScorerAgent.inst;
  }

  static reset(): void {
    ChurnRiskScorerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChurnLlm();
  }

  async run(input: ChurnInput): Promise<ChurnOutput> {
    return runChurnAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Data scientist aplicado a retención top 1%; combinas heurísticas de producto y señales de engagement para un score explicable.",
        mission:
          "Calcula score de riesgo 0–100 con factores ponderados, intervalo de confianza cualitativo y líneas de evidencia.",
        fewShotExample: `Input: últimos 30d opens email caen 60%, login 1 vez/semana, ticket soporte abierto.
Output JSON: score 72, riskLevel high, acciones de pilot rescue + revisión onboarding.`,
      },
      input,
    );
  }
}

export function getChurnRiskScorerAgent(): ChurnRiskScorerAgent {
  return ChurnRiskScorerAgent.instance;
}

export function resetChurnRiskScorerAgentForTests(): void {
  ChurnRiskScorerAgent.reset();
}
