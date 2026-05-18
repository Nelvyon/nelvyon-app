import type { ILlmClient } from "../../LlmClient";
import type { CommunityInput, CommunityOutput } from "./shared";
import { getDefaultCommunityLlm, runCommunityAgentCore } from "./shared";

const AGENT_ID = "community-retention";

export class CommunityRetentionAgent {
  private static inst: CommunityRetentionAgent | undefined;

  static get instance(): CommunityRetentionAgent {
    if (!CommunityRetentionAgent.inst) CommunityRetentionAgent.inst = new CommunityRetentionAgent();
    return CommunityRetentionAgent.inst;
  }

  static reset(): void {
    CommunityRetentionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCommunityLlm();
  }

  async run(input: CommunityInput): Promise<CommunityOutput> {
    const eliteRole = "Eres **Community Retention** — reactivación de miembros inactivos.";
    const mission =
      "Reactiva **miembros inactivos** con **notificaciones personalizadas**; retención mes 1 **>80%**.";
    const fewShot =
      '{"content":"Retention: reactivación inactivos, notifs personalizadas, >80% M1","score":89,"highlights":[">80% M1","Win-back"],"metrics":["Month-1 retention"]}';
    return runCommunityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.45);
  }
}

export function getCommunityRetentionAgent(): CommunityRetentionAgent {
  return CommunityRetentionAgent.instance;
}

export function resetCommunityRetentionAgentForTests(): void {
  CommunityRetentionAgent.reset();
}
