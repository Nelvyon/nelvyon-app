import type { ILlmClient } from "../../LlmClient";
import type { ReportingInput, ReportingOutput } from "./shared";
import { getDefaultReportingLlm, runReportingAgentCore } from "./shared";

const AGENT_ID = "reporting-insight-extractor";

export class ReportingInsightExtractorAgent {
  private static inst: ReportingInsightExtractorAgent | undefined;

  static get instance(): ReportingInsightExtractorAgent {
    if (!ReportingInsightExtractorAgent.inst) ReportingInsightExtractorAgent.inst = new ReportingInsightExtractorAgent();
    return ReportingInsightExtractorAgent.inst;
  }

  static reset(): void {
    ReportingInsightExtractorAgent.inst = undefined;
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
          "ROLE: Insight strategist top 1%; separas correlación de causalidad y priorizas por impacto.",
        mission:
          "Extrae 5–8 insights accionables de las métricas; cada uno con implicación y prioridad.",
        fewShotExample: `Input: caída leads calificados pero sube conversión.
Output JSON: insight “calidad sobre volumen”; sections ["Insights clave"]; highlights con icon theme.`,
      },
      input,
    );
  }
}

export function getReportingInsightExtractorAgent(): ReportingInsightExtractorAgent {
  return ReportingInsightExtractorAgent.instance;
}

export function resetReportingInsightExtractorAgentForTests(): void {
  ReportingInsightExtractorAgent.reset();
}
