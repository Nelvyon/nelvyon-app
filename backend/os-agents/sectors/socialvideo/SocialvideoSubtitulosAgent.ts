import type { ILlmClient } from "../../LlmClient";
import type { SocialvideoInput, SocialvideoOutput } from "./shared";
import { getDefaultSocialvideoLlm, runSocialvideoAgentCore } from "./shared";

const AGENT_ID = "socialvideo-subtitulos";

let inst: SocialvideoSubtitulosAgent | null = null;

export class SocialvideoSubtitulosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SocialvideoSubtitulosAgent {
    if (!inst) inst = new SocialvideoSubtitulosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialvideoLlm();
  }

  async execute(input: SocialvideoInput): Promise<SocialvideoOutput> {
    return runSocialvideoAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getSocialvideoSubtitulosAgent(): SocialvideoSubtitulosAgent {
  return SocialvideoSubtitulosAgent.instance();
}

export function resetSocialvideoSubtitulosAgentForTests(): void {
  inst = null;
}
