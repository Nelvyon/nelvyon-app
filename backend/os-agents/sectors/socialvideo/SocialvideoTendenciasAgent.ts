import type { ILlmClient } from "../../LlmClient";
import type { SocialvideoInput, SocialvideoOutput } from "./shared";
import { getDefaultSocialvideoLlm, runSocialvideoAgentCore } from "./shared";

const AGENT_ID = "socialvideo-tendencias";

let inst: SocialvideoTendenciasAgent | null = null;

export class SocialvideoTendenciasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SocialvideoTendenciasAgent {
    if (!inst) inst = new SocialvideoTendenciasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialvideoLlm();
  }

  async execute(input: SocialvideoInput): Promise<SocialvideoOutput> {
    return runSocialvideoAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getSocialvideoTendenciasAgent(): SocialvideoTendenciasAgent {
  return SocialvideoTendenciasAgent.instance();
}

export function resetSocialvideoTendenciasAgentForTests(): void {
  inst = null;
}
