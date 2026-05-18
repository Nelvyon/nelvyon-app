import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-campaign-launch";

export class SocialCampaignLaunchAgent {
  private static inst: SocialCampaignLaunchAgent | undefined;

  static get instance(): SocialCampaignLaunchAgent {
    if (!SocialCampaignLaunchAgent.inst) SocialCampaignLaunchAgent.inst = new SocialCampaignLaunchAgent();
    return SocialCampaignLaunchAgent.inst;
  }

  static reset(): void {
    SocialCampaignLaunchAgent.inst = undefined;
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
          "ROLE: Integrated campaign director RRSS top 1%; countdown coherente cross-platform.",
        mission:
          "Planifica lanzamiento multicanal: fases teaser→reveal→UGC→proof; roles por plataforma y KPI.",
        fewShotExample:
          "Input: product drop limitado. Output JSON: timeline 14 días; posts por hito; hashtags campaña.",
      },
      input,
    );
  }
}

export function getSocialCampaignLaunchAgent(): SocialCampaignLaunchAgent {
  return SocialCampaignLaunchAgent.instance;
}

export function resetSocialCampaignLaunchAgentForTests(): void {
  SocialCampaignLaunchAgent.reset();
}
