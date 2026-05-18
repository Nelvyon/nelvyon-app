import type { ILlmClient } from "../../LlmClient";
import type { SocialvideoInput, SocialvideoOutput } from "./shared";
import { getDefaultSocialvideoLlm, runSocialvideoAgentCore } from "./shared";

const AGENT_ID = "socialvideo-calendario";

let inst: SocialvideoCalendarioAgent | null = null;

export class SocialvideoCalendarioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SocialvideoCalendarioAgent {
    if (!inst) inst = new SocialvideoCalendarioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialvideoLlm();
  }

  async execute(input: SocialvideoInput): Promise<SocialvideoOutput> {
    return runSocialvideoAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getSocialvideoCalendarioAgent(): SocialvideoCalendarioAgent {
  return SocialvideoCalendarioAgent.instance();
}

export function resetSocialvideoCalendarioAgentForTests(): void {
  inst = null;
}
