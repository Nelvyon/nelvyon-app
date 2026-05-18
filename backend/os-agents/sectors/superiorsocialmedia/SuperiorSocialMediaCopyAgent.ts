import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
import { getDefaultSuperiorSocialMediaLlm, runSuperiorSocialMediaAgentCore } from "./shared";

const AGENT_ID = "superiorsocialmedia-copy";

export class SuperiorSocialMediaCopyAgent {
  private static inst: SuperiorSocialMediaCopyAgent | undefined;

  static get instance(): SuperiorSocialMediaCopyAgent {
    if (!SuperiorSocialMediaCopyAgent.inst) SuperiorSocialMediaCopyAgent.inst = new SuperiorSocialMediaCopyAgent();
    return SuperiorSocialMediaCopyAgent.inst;
  }

  static reset(): void {
    SuperiorSocialMediaCopyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSocialMediaLlm();
  }

  async run(input: SuperiorSocialMediaInput): Promise<SuperiorSocialMediaOutput> {
    const eliteRole =
      "Eres **SuperiorSocialMedia Copy Lead** — copy nativo por red.";
    const mission =
      "Genera **copy por plataforma** (X, LinkedIn, Instagram, TikTok, Facebook): **hooks virales** y **CTAs**; engagement **>5%**.";
    const fewShot =
      '{"content":"Platform-native hooks + CTA, ER >5% target","score":90,"highlights":["Viral hook","Per-platform tone"],"metrics":["Engagement rate"]}';
    return runSuperiorSocialMediaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getSuperiorSocialMediaCopyAgent(): SuperiorSocialMediaCopyAgent {
  return SuperiorSocialMediaCopyAgent.instance;
}

export function resetSuperiorSocialMediaCopyAgentForTests(): void {
  SuperiorSocialMediaCopyAgent.reset();
}
