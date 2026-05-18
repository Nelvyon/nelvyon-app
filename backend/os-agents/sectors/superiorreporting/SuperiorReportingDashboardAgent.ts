import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
import { getDefaultSuperiorReportingLlm, runSuperiorReportingAgentCore } from "./shared";

const AGENT_ID = "superiorreporting-dashboard";

export class SuperiorReportingDashboardAgent {
  private static inst: SuperiorReportingDashboardAgent | undefined;

  static get instance(): SuperiorReportingDashboardAgent {
    if (!SuperiorReportingDashboardAgent.inst) SuperiorReportingDashboardAgent.inst = new SuperiorReportingDashboardAgent();
    return SuperiorReportingDashboardAgent.inst;
  }

  static reset(): void {
    SuperiorReportingDashboardAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReportingLlm();
  }

  async run(input: SuperiorReportingInput): Promise<SuperiorReportingOutput> {
    const eliteRole = "Eres **SuperiorReporting Dashboard** — dashboards ejecutivos en tiempo real.";
    const mission =
      "Diseña **dashboards ejecutivos en tiempo real** con KPIs por área y **drill-down automático**; latencia **<30s**.";
    const fewShot =
      '{"content":"Executive real-time dashboards, KPI drill-down <30s latency","score":90,"highlights":["<30s latency","Auto drill-down"],"metrics":["Dashboard freshness"]}';
    return runSuperiorReportingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorReportingDashboardAgent(): SuperiorReportingDashboardAgent {
  return SuperiorReportingDashboardAgent.instance;
}

export function resetSuperiorReportingDashboardAgentForTests(): void {
  SuperiorReportingDashboardAgent.reset();
}
