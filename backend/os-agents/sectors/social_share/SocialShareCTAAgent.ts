import type { ILlmClient } from "../../LlmClient";
import type { SocialShareInput, SocialShareOutput } from "./shared";
import { getDefaultSocialShareLlm, runSocialShareAgentCore } from "./shared";

const AGENT_ID = "social-share-cta";

export class SocialShareCTAAgent {
  private static inst: SocialShareCTAAgent | undefined;

  static get instance(): SocialShareCTAAgent {
    if (!SocialShareCTAAgent.inst) SocialShareCTAAgent.inst = new SocialShareCTAAgent();
    return SocialShareCTAAgent.inst;
  }

  static reset(): void {
    SocialShareCTAAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialShareLlm();
  }

  async run(input: SocialShareInput): Promise<SocialShareOutput> {
    return runSocialShareAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Conversion copy top 1%; CTA referral sin parecer spam.",
        mission:
          "Inserta CTA de referral en cada share: variaciones cortas, link único UTM-tagged, disclosure transparente.",
        fewShotExample:
          '{"content":"CTA: Prueba NELVYON con mi enlace — ambos ganamos.","score":90,"highlights":["Link único por user","utm_campaign=referral_share"],"metrics":["1 CTA primario + 1 soft"]}',
      },
      input,
      0.5,
    );
  }
}

export function getSocialShareCTAAgent(): SocialShareCTAAgent {
  return SocialShareCTAAgent.instance;
}

export function resetSocialShareCTAAgentForTests(): void {
  SocialShareCTAAgent.reset();
}
