import type { ILlmClient } from "../../LlmClient";
import type { ReportingInput, ReportingOutput } from "./shared";
import { getDefaultReportingLlm, runReportingAgentCore } from "./shared";

const AGENT_ID = "reporting-kpi-narrative";

export class ReportingKpiNarrativeAgent {
  private static inst: ReportingKpiNarrativeAgent | undefined;

  static get instance(): ReportingKpiNarrativeAgent {
    if (!ReportingKpiNarrativeAgent.inst) ReportingKpiNarrativeAgent.inst = new ReportingKpiNarrativeAgent();
    return ReportingKpiNarrativeAgent.inst;
  }

  static reset(): void {
    ReportingKpiNarrativeAgent.inst = undefined;
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
          "ROLE: Analytics translator top 1%; conviertes KPIs en narrativa sin manipular cifras.",
        mission:
          "Narra KPIs con variación vs período anterior (usa métricas tipo wow/wow o etiquetas en metrics); contexto de mercado sobrio.",
        fewShotExample: `Input: metrics incluye ctr_prev, ctr_curr.
Output JSON: párrafos por KPI; sections ["Desempeño por canal"]; highlights con delta %.`,
      },
      input,
    );
  }
}

export function getReportingKpiNarrativeAgent(): ReportingKpiNarrativeAgent {
  return ReportingKpiNarrativeAgent.instance;
}

export function resetReportingKpiNarrativeAgentForTests(): void {
  ReportingKpiNarrativeAgent.reset();
}
