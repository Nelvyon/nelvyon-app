import type { ILlmClient } from "../../LlmClient";
import type { SocialvideoInput, SocialvideoOutput } from "./shared";
import { getDefaultSocialvideoLlm, runSocialvideoAgentCore } from "./shared";

const AGENT_ID = "socialvideo-analytics";

let inst: SocialvideoAnalyticsAgent | null = null;

export class SocialvideoAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SocialvideoAnalyticsAgent {
    if (!inst) inst = new SocialvideoAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialvideoLlm();
  }

  async execute(input: SocialvideoInput): Promise<SocialvideoOutput> {
    return runSocialvideoAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getSocialvideoAnalyticsAgent(): SocialvideoAnalyticsAgent {
  return SocialvideoAnalyticsAgent.instance();
}

export function resetSocialvideoAnalyticsAgentForTests(): void {
  inst = null;
}
