import type { ILlmClient } from "../../LlmClient";
import type { SocialShareInput, SocialShareOutput } from "./shared";
import { getDefaultSocialShareLlm, runSocialShareAgentCore } from "./shared";

const AGENT_ID = "social-share-tracker";

export class SocialShareTrackerAgent {
  private static inst: SocialShareTrackerAgent | undefined;

  static get instance(): SocialShareTrackerAgent {
    if (!SocialShareTrackerAgent.inst) SocialShareTrackerAgent.inst = new SocialShareTrackerAgent();
    return SocialShareTrackerAgent.inst;
  }

  static reset(): void {
    SocialShareTrackerAgent.inst = undefined;
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
        eliteRole: "ROLE: Attribution engineer top 1%; UTMs + shortlinks auditables.",
        mission:
          "Define tracking de clicks, impresiones y conversiones desde shares hacia social_share_events y funnel signup.",
        fewShotExample:
          '{"content":"utm_source=share&utm_medium=social&utm_campaign=referral_link único.","score":92,"highlights":["Pixel opcional consentido","Server-side click dedupe"],"metrics":["CTR por red","Conv/click"]}',
      },
      input,
      0.1,
    );
  }
}

export function getSocialShareTrackerAgent(): SocialShareTrackerAgent {
  return SocialShareTrackerAgent.instance;
}

export function resetSocialShareTrackerAgentForTests(): void {
  SocialShareTrackerAgent.reset();
}
