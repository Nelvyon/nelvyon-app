import type { ILlmClient } from "../../LlmClient";
import type { CommunityInput, CommunityOutput } from "./shared";
import { getDefaultCommunityLlm, runCommunityAgentCore } from "./shared";

const AGENT_ID = "community-moderation";

export class CommunityModerationAgent {
  private static inst: CommunityModerationAgent | undefined;

  static get instance(): CommunityModerationAgent {
    if (!CommunityModerationAgent.inst) CommunityModerationAgent.inst = new CommunityModerationAgent();
    return CommunityModerationAgent.inst;
  }

  static reset(): void {
    CommunityModerationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCommunityLlm();
  }

  async run(input: CommunityInput): Promise<CommunityOutput> {
    const eliteRole = "Eres **Community Moderation** — moderación IA en tiempo real.";
    const mission =
      "Detecta **spam** y **toxicidad** en tiempo real; **moderación automática 100%** sin intervención humana.";
    const fewShot =
      '{"content":"Moderation: spam/toxicidad RT, 100% auto sin humano","score":95,"highlights":["100% auto","Spam RT"],"metrics":["Moderation coverage"]}';
    return runCommunityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getCommunityModerationAgent(): CommunityModerationAgent {
  return CommunityModerationAgent.instance;
}

export function resetCommunityModerationAgentForTests(): void {
  CommunityModerationAgent.reset();
}
