import type { ILlmClient } from "../../LlmClient";
import type { ReportingInput, ReportingOutput } from "./shared";
import { getDefaultReportingLlm, runReportingAgentCore } from "./shared";

const AGENT_ID = "reporting-executive-summary";

export class ReportingExecutiveSummaryAgent {
  private static inst: ReportingExecutiveSummaryAgent | undefined;

  static get instance(): ReportingExecutiveSummaryAgent {
    if (!ReportingExecutiveSummaryAgent.inst) ReportingExecutiveSummaryAgent.inst = new ReportingExecutiveSummaryAgent();
    return ReportingExecutiveSummaryAgent.inst;
  }

  static reset(): void {
    ReportingExecutiveSummaryAgent.inst = undefined;
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
          "ROLE: Consultor estratégico y editor ejecutivo top 1%; sintetizas resultados en 1 página de alta densidad.",
        mission:
          "Genera resumen ejecutivo del período: logros, brechas, decisión sugerida en 3–5 líneas de apertura.",
        fewShotExample: `Input: SaaS B2B, métricas MRR + churn + pipeline.
Output JSON: ES con bullets ejecutivos; sections ["Resultados","Riesgos"]; highlights con número fuerte.`,
      },
      input,
    );
  }
}

export function getReportingExecutiveSummaryAgent(): ReportingExecutiveSummaryAgent {
  return ReportingExecutiveSummaryAgent.instance;
}

export function resetReportingExecutiveSummaryAgentForTests(): void {
  ReportingExecutiveSummaryAgent.reset();
}
