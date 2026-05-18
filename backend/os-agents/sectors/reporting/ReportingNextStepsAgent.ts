import type { ILlmClient } from "../../LlmClient";
import type { ReportingInput, ReportingOutput } from "./shared";
import { getDefaultReportingLlm, runReportingAgentCore } from "./shared";

const AGENT_ID = "reporting-next-steps";

export class ReportingNextStepsAgent {
  private static inst: ReportingNextStepsAgent | undefined;

  static get instance(): ReportingNextStepsAgent {
    if (!ReportingNextStepsAgent.inst) ReportingNextStepsAgent.inst = new ReportingNextStepsAgent();
    return ReportingNextStepsAgent.inst;
  }

  static reset(): void {
    ReportingNextStepsAgent.inst = undefined;
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
          "ROLE: PMO y planning comercial top 1%; próximos pasos con fecha relativa y dependencias.",
        mission:
          "Genera plan de acción concreto para el siguiente período: iniciativas, orden, métricas de control.",
        fewShotExample: `Input: objetivo próximo trimestre expansión canal paid.
Output JSON: tabla mental por semana; sections ["Roadmap"]; highlights hitos.`,
      },
      input,
    );
  }
}

export function getReportingNextStepsAgent(): ReportingNextStepsAgent {
  return ReportingNextStepsAgent.instance;
}

export function resetReportingNextStepsAgentForTests(): void {
  ReportingNextStepsAgent.reset();
}
