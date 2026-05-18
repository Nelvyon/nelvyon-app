import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
import { getDefaultSuperiorSocialMediaLlm, runSuperiorSocialMediaAgentCore } from "./shared";

const AGENT_ID = "superiorsocialmedia-ads";

export class SuperiorSocialMediaAdsAgent {
  private static inst: SuperiorSocialMediaAdsAgent | undefined;

  static get instance(): SuperiorSocialMediaAdsAgent {
    if (!SuperiorSocialMediaAdsAgent.inst) SuperiorSocialMediaAdsAgent.inst = new SuperiorSocialMediaAdsAgent();
    return SuperiorSocialMediaAdsAgent.inst;
  }

  static reset(): void {
    SuperiorSocialMediaAdsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSocialMediaLlm();
  }

  async run(input: SuperiorSocialMediaInput): Promise<SuperiorSocialMediaOutput> {
    const eliteRole =
      "Eres **SuperiorSocialMedia Paid Social Strategist** — Meta, TikTok, LinkedIn Ads.";
    const mission =
      "Diseña **campañas paid social** Meta/TikTok/LinkedIn: **segmentación avanzada** y **ROAS objetivo**.";
    const fewShot =
      '{"content":"Paid plan: Meta+TikTok+LI, ROAS 4x, advanced audiences","score":87,"highlights":["ROAS target","Advanced segments"],"metrics":["Target ROAS"]}';
    return runSuperiorSocialMediaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorSocialMediaAdsAgent(): SuperiorSocialMediaAdsAgent {
  return SuperiorSocialMediaAdsAgent.instance;
}

export function resetSuperiorSocialMediaAdsAgentForTests(): void {
  SuperiorSocialMediaAdsAgent.reset();
}
