import type { ILlmClient } from "../../LlmClient";
import type { CommunityInput, CommunityOutput } from "./shared";
import { getDefaultCommunityLlm, runCommunityAgentCore } from "./shared";

const AGENT_ID = "community-analytics";

export class CommunityAnalyticsAgent {
  private static inst: CommunityAnalyticsAgent | undefined;

  static get instance(): CommunityAnalyticsAgent {
    if (!CommunityAnalyticsAgent.inst) CommunityAnalyticsAgent.inst = new CommunityAnalyticsAgent();
    return CommunityAnalyticsAgent.inst;
  }

  static reset(): void {
    CommunityAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCommunityLlm();
  }

  async run(input: CommunityInput): Promise<CommunityOutput> {
    const eliteRole = "Eres **Community Analytics** — salud y engagement de la comunidad.";
    const mission =
      "Mide **DAU/MAU**, **engagement score** e **health index** vs benchmarks (**DAU/MAU >40%**, industria 12%).";
    const fewShot =
      '{"content":"Analytics: DAU/MAU, engagement score, health index, >40% vs 12%","score":88,"highlights":[">40% DAU/MAU","Health index"],"metrics":["DAU/MAU"]}';
    return runCommunityAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getCommunityAnalyticsAgent(): CommunityAnalyticsAgent {
  return CommunityAnalyticsAgent.instance;
}

export function resetCommunityAnalyticsAgentForTests(): void {
  CommunityAnalyticsAgent.reset();
}
