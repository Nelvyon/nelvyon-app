import type { ILlmClient } from "../../LlmClient";
import type { ReportingInput, ReportingOutput } from "./shared";
import { getDefaultReportingLlm, runReportingAgentCore } from "./shared";

const AGENT_ID = "reporting-competitive-context";

export class ReportingCompetitiveContextAgent {
  private static inst: ReportingCompetitiveContextAgent | undefined;

  static get instance(): ReportingCompetitiveContextAgent {
    if (!ReportingCompetitiveContextAgent.inst) ReportingCompetitiveContextAgent.inst = new ReportingCompetitiveContextAgent();
    return ReportingCompetitiveContextAgent.inst;
  }

  static reset(): void {
    ReportingCompetitiveContextAgent.inst = undefined;
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
          "ROLE: Market intelligence aplicado a reporting top 1%; marcos sectoriales sin inventar rankings.",
        mission:
          "Añade contexto competitivo al informe usando solo lo inferible del sector y métricas; brechas y oportunidades relativas.",
        fewShotExample: `Input: ecommerce moda, métricas conversión y retorno.
Output JSON: marco “densidad promocional sector”; sections ["Panorama competitivo"]; highlights con takeaway.`,
      },
      input,
    );
  }
}

export function getReportingCompetitiveContextAgent(): ReportingCompetitiveContextAgent {
  return ReportingCompetitiveContextAgent.instance;
}

export function resetReportingCompetitiveContextAgentForTests(): void {
  ReportingCompetitiveContextAgent.reset();
}
