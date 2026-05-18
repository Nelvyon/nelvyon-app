import type { ILlmClient } from "../../LlmClient";
import type { SocialShareInput, SocialShareOutput } from "./shared";
import { getDefaultSocialShareLlm, runSocialShareAgentCore } from "./shared";

const AGENT_ID = "social-share-copy";

export class SocialShareCopyAgent {
  private static inst: SocialShareCopyAgent | undefined;

  static get instance(): SocialShareCopyAgent {
    if (!SocialShareCopyAgent.inst) SocialShareCopyAgent.inst = new SocialShareCopyAgent();
    return SocialShareCopyAgent.inst;
  }

  static reset(): void {
    SocialShareCopyAgent.inst = undefined;
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
        eliteRole: "ROLE: Multi-channel copy chief top 1%; límites caracteres por red.",
        mission:
          "Genera copy optimizado por Twitter/X, LinkedIn, Instagram y WhatsApp con link referral único incrustado o al final.",
        fewShotExample:
          '{"content":"Pack 4 variantes + límites chars; CTA referral explícito.","score":88,"highlights":["X ≤280 con link","LI primeras 2 líneas gancho"],"metrics":["IG caption + línea bio","WA mensaje corto share"]}',
      },
      input,
      0.7,
    );
  }
}

export function getSocialShareCopyAgent(): SocialShareCopyAgent {
  return SocialShareCopyAgent.instance;
}

export function resetSocialShareCopyAgentForTests(): void {
  SocialShareCopyAgent.reset();
}
