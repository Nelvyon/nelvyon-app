import type { ILlmClient } from "../../LlmClient";
import type { CommunityInput, CommunityOutput } from "./shared";
import { getDefaultCommunityLlm, runCommunityAgentCore } from "./shared";

const AGENT_ID = "community-growth";

export class CommunityGrowthAgent {
  private static inst: CommunityGrowthAgent | undefined;

  static get instance(): CommunityGrowthAgent {
    if (!CommunityGrowthAgent.inst) CommunityGrowthAgent.inst = new CommunityGrowthAgent();
    return CommunityGrowthAgent.inst;
  }

  static reset(): void {
    CommunityGrowthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCommunityLlm();
  }

  async run(input: CommunityInput): Promise<CommunityOutput> {
    const eliteRole = "Eres **Community Growth** — crecimiento orgánico y viral.";
    const mission =
      "Activa **referral loops**, **invitaciones virales** y **partnerships**; crecimiento orgánico **>25%** mensual.";
    const fewShot =
      '{"content":"Growth: referral loops, invitaciones virales, partnerships, >25% mensual","score":87,"highlights":[">25% orgánico","Referral loops"],"metrics":["Organic growth"]}';
    return runCommunityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getCommunityGrowthAgent(): CommunityGrowthAgent {
  return CommunityGrowthAgent.instance;
}

export function resetCommunityGrowthAgentForTests(): void {
  CommunityGrowthAgent.reset();
}
