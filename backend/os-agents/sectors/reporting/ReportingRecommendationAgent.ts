import type { ILlmClient } from "../../LlmClient";
import type { ReportingInput, ReportingOutput } from "./shared";
import { getDefaultReportingLlm, runReportingAgentCore } from "./shared";

const AGENT_ID = "reporting-recommendation";

export class ReportingRecommendationAgent {
  private static inst: ReportingRecommendationAgent | undefined;

  static get instance(): ReportingRecommendationAgent {
    if (!ReportingRecommendationAgent.inst) ReportingRecommendationAgent.inst = new ReportingRecommendationAgent();
    return ReportingRecommendationAgent.inst;
  }

  static reset(): void {
    ReportingRecommendationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultReportingLlm();
  }

  async run(input: ReportingInput): Promise<ReportingOutput> {
    return runReportingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Estratega de growth senior top 1%; recomendaciones con dueño, esfuerzo e hipótesis medible.",
        mission:
          "Genera recomendaciones estratégicas para el próximo período alineadas a las métricas entregadas.",
        fewShotExample: `Input: ROAS estable pero CAC sube.
Output JSON: priorizar retargeting + creatividades UGC; sections ["Recomendaciones"]; highlights top 3.`,
      },
      input,
    );
  }
}

export function getReportingRecommendationAgent(): ReportingRecommendationAgent {
  return ReportingRecommendationAgent.instance;
}

export function resetReportingRecommendationAgentForTests(): void {
  ReportingRecommendationAgent.reset();
}
