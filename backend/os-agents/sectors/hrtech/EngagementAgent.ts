import type { ILlmClient } from "../../LlmClient";
import type { HrTechInput, HrTechOutput } from "./shared";
import { getDefaultHrTechLlm, runHrTechAgentCore } from "./shared";

const AGENT_ID = "hrtech-engagement";

export class EngagementAgent {
  private static inst: EngagementAgent | undefined;

  static get instance(): EngagementAgent {
    if (!EngagementAgent.inst) EngagementAgent.inst = new EngagementAgent();
    return EngagementAgent.inst;
  }

  static reset(): void {
    EngagementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHrTechLlm();
  }

  async run(input: HrTechInput): Promise<HrTechOutput> {
    const eliteRole = "Eres **Engagement** — clima y retención.";
    const mission =
      "Gestiona **encuestas de clima**, **eNPS mensual automático** sin encuestador y **detección temprana de fuga** con **turnover - >30%**.";
    const fewShot =
      '{"content":"Engagement: clima, eNPS mensual auto, riesgo fuga, turnover - >30%","score":95,"highlights":["eNPS mensual","Turnover - >30%"],"metrics":["eNPS"]}';
    return runHrTechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getEngagementAgent(): EngagementAgent {
  return EngagementAgent.instance;
}

export function resetEngagementAgentForTests(): void {
  EngagementAgent.reset();
}
