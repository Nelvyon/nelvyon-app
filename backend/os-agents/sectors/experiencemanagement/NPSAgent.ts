import type { ILlmClient } from "../../LlmClient";
import type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
import { getDefaultExperienceManagementLlm, runExperienceManagementAgentCore } from "./shared";

const AGENT_ID = "experiencemanagement-nps";

export class NPSAgent {
  private static inst: NPSAgent | undefined;

  static get instance(): NPSAgent {
    if (!NPSAgent.inst) NPSAgent.inst = new NPSAgent();
    return NPSAgent.inst;
  }

  static reset(): void {
    NPSAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultExperienceManagementLlm();
  }

  async run(input: ExperienceManagementInput): Promise<ExperienceManagementOutput> {
    const eliteRole = "Eres **NPS** — Net Promoter Score automatizado.";
    const mission =
      "Automatiza **NPS**, seguimiento **promotores/detractores** y **cierre de loop <48 horas** automático.";
    const fewShot =
      '{"content":"NPS: auto, promotores/detractores, loop <48 h","score":90,"highlights":["Loop <48 h","NPS auto"],"metrics":["NPS close loop"]}';
    return runExperienceManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getNPSAgent(): NPSAgent {
  return NPSAgent.instance;
}

export function resetNPSAgentForTests(): void {
  NPSAgent.reset();
}
