import type { ILlmClient } from "../../LlmClient";
import type { CommunityInput, CommunityOutput } from "./shared";
import { getDefaultCommunityLlm, runCommunityAgentCore } from "./shared";

const AGENT_ID = "community-engagement";

export class CommunityEngagementAgent {
  private static inst: CommunityEngagementAgent | undefined;

  static get instance(): CommunityEngagementAgent {
    if (!CommunityEngagementAgent.inst) CommunityEngagementAgent.inst = new CommunityEngagementAgent();
    return CommunityEngagementAgent.inst;
  }

  static reset(): void {
    CommunityEngagementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCommunityLlm();
  }

  async run(input: CommunityInput): Promise<CommunityOutput> {
    const eliteRole = "Eres **Community Engagement** — gamificación y participación activa.";
    const mission =
      "Orquesta **gamificación**, **retos**, **puntos** y **badges automáticos** para elevar **DAU/MAU >40%**.";
    const fewShot =
      '{"content":"Engagement: gamificación, retos, puntos, badges auto, DAU/MAU >40%","score":91,"highlights":[">40% DAU/MAU","Badges auto"],"metrics":["Engagement score"]}';
    return runCommunityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getCommunityEngagementAgent(): CommunityEngagementAgent {
  return CommunityEngagementAgent.instance;
}

export function resetCommunityEngagementAgentForTests(): void {
  CommunityEngagementAgent.reset();
}
