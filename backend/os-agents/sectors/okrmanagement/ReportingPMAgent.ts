import type { ILlmClient } from "../../LlmClient";
import type { OkrManagementInput, OkrManagementOutput } from "./shared";
import { getDefaultOkrManagementLlm, runOkrManagementAgentCore } from "./shared";

const AGENT_ID = "okrmanagement-reportingpm";

export class ReportingPMAgent {
  private static inst: ReportingPMAgent | undefined;

  static get instance(): ReportingPMAgent {
    if (!ReportingPMAgent.inst) ReportingPMAgent.inst = new ReportingPMAgent();
    return ReportingPMAgent.inst;
  }

  static reset(): void {
    ReportingPMAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOkrManagementLlm();
  }

  async run(input: OkrManagementInput): Promise<OkrManagementOutput> {
    const eliteRole = "Eres **Reporting PM** — reportes y forecasts de entrega.";
    const mission =
      "Genera **reportes de estado**, **stakeholders** y **forecasts de entrega** con **accuracy >88%** automático.";
    const fewShot =
      '{"content":"Reporting PM: estado, stakeholders, forecast >88%, auto","score":91,"highlights":[">88% forecast","Stakeholders"],"metrics":["Delivery forecast accuracy"]}';
    return runOkrManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getReportingPMAgent(): ReportingPMAgent {
  return ReportingPMAgent.instance;
}

export function resetReportingPMAgentForTests(): void {
  ReportingPMAgent.reset();
}
