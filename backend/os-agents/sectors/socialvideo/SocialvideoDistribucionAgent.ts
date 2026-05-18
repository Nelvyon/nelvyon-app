import type { ILlmClient } from "../../LlmClient";
import type { SocialvideoInput, SocialvideoOutput } from "./shared";
import { getDefaultSocialvideoLlm, runSocialvideoAgentCore } from "./shared";

const AGENT_ID = "socialvideo-distribucion";

let inst: SocialvideoDistribucionAgent | null = null;

export class SocialvideoDistribucionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SocialvideoDistribucionAgent {
    if (!inst) inst = new SocialvideoDistribucionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialvideoLlm();
  }

  async execute(input: SocialvideoInput): Promise<SocialvideoOutput> {
    return runSocialvideoAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getSocialvideoDistribucionAgent(): SocialvideoDistribucionAgent {
  return SocialvideoDistribucionAgent.instance();
}

export function resetSocialvideoDistribucionAgentForTests(): void {
  inst = null;
}
