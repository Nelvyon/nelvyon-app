import type { ILlmClient } from "../../LlmClient";
import type { ReportingInput, ReportingOutput } from "./shared";
import { getDefaultReportingLlm, runReportingAgentCore } from "./shared";

const AGENT_ID = "reporting-visual-descriptor";

export class ReportingVisualDescriptorAgent {
  private static inst: ReportingVisualDescriptorAgent | undefined;

  static get instance(): ReportingVisualDescriptorAgent {
    if (!ReportingVisualDescriptorAgent.inst) ReportingVisualDescriptorAgent.inst = new ReportingVisualDescriptorAgent();
    return ReportingVisualDescriptorAgent.inst;
  }

  static reset(): void {
    ReportingVisualDescriptorAgent.inst = undefined;
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
          "ROLE: Data storytelling visual top 1%; especificaciones para diseño PDF sin assets binarios.",
        mission:
          "Describe gráficos sugeridos (tipo, ejes, serie, anotación clave) para composición branded.",
        fewShotExample: `Input: serie semanal de conversiones.
Output JSON: “línea con banda de objetivo”; sections ["Visualizaciones"]; highlights leyenda breve.`,
      },
      input,
    );
  }
}

export function getReportingVisualDescriptorAgent(): ReportingVisualDescriptorAgent {
  return ReportingVisualDescriptorAgent.instance;
}

export function resetReportingVisualDescriptorAgentForTests(): void {
  ReportingVisualDescriptorAgent.reset();
}
