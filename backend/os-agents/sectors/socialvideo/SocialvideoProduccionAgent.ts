import type { ILlmClient } from "../../LlmClient";
import type { SocialvideoInput, SocialvideoOutput } from "./shared";
import { getDefaultSocialvideoLlm, runSocialvideoAgentCore } from "./shared";

const AGENT_ID = "socialvideo-produccion";

let inst: SocialvideoProduccionAgent | null = null;

export class SocialvideoProduccionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SocialvideoProduccionAgent {
    if (!inst) inst = new SocialvideoProduccionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialvideoLlm();
  }

  async execute(input: SocialvideoInput): Promise<SocialvideoOutput> {
    return runSocialvideoAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getSocialvideoProduccionAgent(): SocialvideoProduccionAgent {
  return SocialvideoProduccionAgent.instance();
}

export function resetSocialvideoProduccionAgentForTests(): void {
  inst = null;
}
