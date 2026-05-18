import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-copywriter";

export class SocialCopywriterAgent {
  private static inst: SocialCopywriterAgent | undefined;

  static get instance(): SocialCopywriterAgent {
    if (!SocialCopywriterAgent.inst) SocialCopywriterAgent.inst = new SocialCopywriterAgent();
    return SocialCopywriterAgent.inst;
  }

  static reset(): void {
    SocialCopywriterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialLlm();
  }

  async run(input: SocialInput): Promise<SocialOutput> {
    return runSocialAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Copywriter multicanal top 1%; adaptas longitud, tono y CTA a cada red.",
        mission:
          "Redacta posts optimizados por plataforma indicada (Instagram, LinkedIn, X, TikTok): uno por red en posts[].",
        fewShotExample:
          "Input: mismo mensaje lanzamiento. Output JSON: 4 variantes; hashtags cluster primario + long tail.",
      },
      input,
    );
  }
}

export function getSocialCopywriterAgent(): SocialCopywriterAgent {
  return SocialCopywriterAgent.instance;
}

export function resetSocialCopywriterAgentForTests(): void {
  SocialCopywriterAgent.reset();
}
