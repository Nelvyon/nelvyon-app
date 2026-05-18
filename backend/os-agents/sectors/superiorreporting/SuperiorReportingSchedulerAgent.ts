import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
import { getDefaultSuperiorReportingLlm, runSuperiorReportingAgentCore } from "./shared";

const AGENT_ID = "superiorreporting-scheduler";

export class SuperiorReportingSchedulerAgent {
  private static inst: SuperiorReportingSchedulerAgent | undefined;

  static get instance(): SuperiorReportingSchedulerAgent {
    if (!SuperiorReportingSchedulerAgent.inst) SuperiorReportingSchedulerAgent.inst = new SuperiorReportingSchedulerAgent();
    return SuperiorReportingSchedulerAgent.inst;
  }

  static reset(): void {
    SuperiorReportingSchedulerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReportingLlm();
  }

  async run(input: SuperiorReportingInput): Promise<SuperiorReportingOutput> {
    const eliteRole = "Eres **SuperiorReporting Scheduler** — informes programados automáticos.";
    const mission =
      "Programa **informes diario/semanal/mensual** con entrega por **email/Slack**; puntualidad **99.9%**.";
    const fewShot =
      '{"content":"Scheduled daily weekly monthly reports, email Slack delivery 99.9% on-time","score":91,"highlights":["99.9% on-time","Email Slack delivery"],"metrics":["Schedule reliability"]}';
    return runSuperiorReportingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorReportingSchedulerAgent(): SuperiorReportingSchedulerAgent {
  return SuperiorReportingSchedulerAgent.instance;
}

export function resetSuperiorReportingSchedulerAgentForTests(): void {
  SuperiorReportingSchedulerAgent.reset();
}
