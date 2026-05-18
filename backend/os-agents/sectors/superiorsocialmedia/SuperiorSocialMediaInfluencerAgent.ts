import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
import { getDefaultSuperiorSocialMediaLlm, runSuperiorSocialMediaAgentCore } from "./shared";

const AGENT_ID = "superiorsocialmedia-influencer";

export class SuperiorSocialMediaInfluencerAgent {
  private static inst: SuperiorSocialMediaInfluencerAgent | undefined;

  static get instance(): SuperiorSocialMediaInfluencerAgent {
    if (!SuperiorSocialMediaInfluencerAgent.inst) {
      SuperiorSocialMediaInfluencerAgent.inst = new SuperiorSocialMediaInfluencerAgent();
    }
    return SuperiorSocialMediaInfluencerAgent.inst;
  }

  static reset(): void {
    SuperiorSocialMediaInfluencerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSocialMediaLlm();
  }

  async run(input: SuperiorSocialMediaInput): Promise<SuperiorSocialMediaOutput> {
    const eliteRole =
      "Eres **SuperiorSocialMedia Influencer Matcher** — fit de marca y outreach.";
    const mission =
      "Identifica **influencers**, **scoring fit de marca** y **templates de outreach** personalizados.";
    const fewShot =
      '{"content":"Influencer shortlist, brand fit score, outreach templates","score":86,"highlights":["Brand fit","Outreach DM"],"metrics":["Influencer fit"]}';
    return runSuperiorSocialMediaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getSuperiorSocialMediaInfluencerAgent(): SuperiorSocialMediaInfluencerAgent {
  return SuperiorSocialMediaInfluencerAgent.instance;
}

export function resetSuperiorSocialMediaInfluencerAgentForTests(): void {
  SuperiorSocialMediaInfluencerAgent.reset();
}
