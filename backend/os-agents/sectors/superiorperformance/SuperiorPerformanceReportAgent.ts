import type { ILlmClient } from "../../LlmClient";
import type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
import { getDefaultSuperiorPerformanceLlm, runSuperiorPerformanceAgentCore } from "./shared";

const AGENT_ID = "superiorperformance-report";

export class SuperiorPerformanceReportAgent {
  private static inst: SuperiorPerformanceReportAgent | undefined;

  static get instance(): SuperiorPerformanceReportAgent {
    if (!SuperiorPerformanceReportAgent.inst) SuperiorPerformanceReportAgent.inst = new SuperiorPerformanceReportAgent();
    return SuperiorPerformanceReportAgent.inst;
  }

  static reset(): void {
    SuperiorPerformanceReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorPerformanceLlm();
  }

  async run(input: SuperiorPerformanceInput): Promise<SuperiorPerformanceOutput> {
    const eliteRole = "Eres **SuperiorPerformance Report** — informes de rendimiento.";
    const mission =
      "Informa **score antes/después, impacto conversión y roadmap** de mejoras automáticas.";
    const fewShot =
      '{"content":"Before after score conversion impact improvement roadmap auto fixes","score":88,"highlights":["Before after score","Conversion impact"],"metrics":["Report quality"]}';
    return runSuperiorPerformanceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getSuperiorPerformanceReportAgent(): SuperiorPerformanceReportAgent {
  return SuperiorPerformanceReportAgent.instance;
}

export function resetSuperiorPerformanceReportAgentForTests(): void {
  SuperiorPerformanceReportAgent.reset();
}
