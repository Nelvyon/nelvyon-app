import type { ILlmClient } from "../../LlmClient";
import type { SocialvideoInput, SocialvideoOutput } from "./shared";
import { getDefaultSocialvideoLlm, runSocialvideoAgentCore } from "./shared";

const AGENT_ID = "socialvideo-estrategia";

let inst: SocialvideoEstrategiaAgent | null = null;

export class SocialvideoEstrategiaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SocialvideoEstrategiaAgent {
    if (!inst) inst = new SocialvideoEstrategiaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialvideoLlm();
  }

  async execute(input: SocialvideoInput): Promise<SocialvideoOutput> {
    return runSocialvideoAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getSocialvideoEstrategiaAgent(): SocialvideoEstrategiaAgent {
  return SocialvideoEstrategiaAgent.instance();
}

export function resetSocialvideoEstrategiaAgentForTests(): void {
  inst = null;
}
