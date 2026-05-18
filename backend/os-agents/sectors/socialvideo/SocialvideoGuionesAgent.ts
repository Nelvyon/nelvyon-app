import type { ILlmClient } from "../../LlmClient";
import type { SocialvideoInput, SocialvideoOutput } from "./shared";
import { getDefaultSocialvideoLlm, runSocialvideoAgentCore } from "./shared";

const AGENT_ID = "socialvideo-guiones";

let inst: SocialvideoGuionesAgent | null = null;

export class SocialvideoGuionesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SocialvideoGuionesAgent {
    if (!inst) inst = new SocialvideoGuionesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialvideoLlm();
  }

  async execute(input: SocialvideoInput): Promise<SocialvideoOutput> {
    return runSocialvideoAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getSocialvideoGuionesAgent(): SocialvideoGuionesAgent {
  return SocialvideoGuionesAgent.instance();
}

export function resetSocialvideoGuionesAgentForTests(): void {
  inst = null;
}
