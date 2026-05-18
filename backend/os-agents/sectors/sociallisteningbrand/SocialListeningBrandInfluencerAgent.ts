import type { ILlmClient } from "../../LlmClient";
import type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
import { getDefaultSocialListeningBrandLlm, runSocialListeningBrandAgentCore } from "./shared";

const AGENT_ID = "sociallisteningbrand-influencer";

export class SocialListeningBrandInfluencerAgent {
  private static inst: SocialListeningBrandInfluencerAgent | undefined;

  static get instance(): SocialListeningBrandInfluencerAgent {
    if (!SocialListeningBrandInfluencerAgent.inst)
      SocialListeningBrandInfluencerAgent.inst = new SocialListeningBrandInfluencerAgent();
    return SocialListeningBrandInfluencerAgent.inst;
  }

  static reset(): void {
    SocialListeningBrandInfluencerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialListeningBrandLlm();
  }

  async run(input: SocialListeningBrandInput): Promise<SocialListeningBrandOutput> {
    const eliteRole = "Eres **SocialListeningBrand Influencer** — influencers que mencionan la marca.";
    const mission =
      "Identifica **influencers** que mencionan la marca y prioriza **oportunidades de colaboración**.";
    const fewShot =
      '{"content":"Influencer: menciones marca, oportunidades colaboración","score":89,"highlights":["Influencers","Collab"],"metrics":["Influencer reach"]}';
    return runSocialListeningBrandAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSocialListeningBrandInfluencerAgent(): SocialListeningBrandInfluencerAgent {
  return SocialListeningBrandInfluencerAgent.instance;
}

export function resetSocialListeningBrandInfluencerAgentForTests(): void {
  SocialListeningBrandInfluencerAgent.reset();
}
