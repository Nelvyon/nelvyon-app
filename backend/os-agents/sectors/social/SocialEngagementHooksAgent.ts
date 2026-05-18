import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-engagement-hooks";

export class SocialEngagementHooksAgent {
  private static inst: SocialEngagementHooksAgent | undefined;

  static get instance(): SocialEngagementHooksAgent {
    if (!SocialEngagementHooksAgent.inst) SocialEngagementHooksAgent.inst = new SocialEngagementHooksAgent();
    return SocialEngagementHooksAgent.inst;
  }

  static reset(): void {
    SocialEngagementHooksAgent.inst = undefined;
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
          "ROLE: Hook engineer viralidad ética top 1%; primera línea que retiene sin sensacionalismo falso.",
        mission:
          "Genera hooks de alto engagement para primeras líneas por formato (short video script, caption, thread opener).",
        fewShotExample:
          "Input: audiencia founders. Output JSON: 12 hooks clasificados; posts uno por hook corto; hashtags sugeridos.",
      },
      input,
    );
  }
}

export function getSocialEngagementHooksAgent(): SocialEngagementHooksAgent {
  return SocialEngagementHooksAgent.instance;
}

export function resetSocialEngagementHooksAgentForTests(): void {
  SocialEngagementHooksAgent.reset();
}
