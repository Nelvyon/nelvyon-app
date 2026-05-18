import type { ILlmClient } from "../../LlmClient";
import type { AdsInput, AdsOutput } from "./shared";
import { getDefaultAdsLlm, runAdsAgentCore } from "./shared";

const AGENT_ID = "ads-google";

let inst: AdsGoogleAgent | null = null;

export class AdsGoogleAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AdsGoogleAgent {
    if (!inst) inst = new AdsGoogleAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAdsLlm();
  }

  async execute(input: AdsInput): Promise<AdsOutput> {
    return runAdsAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getAdsGoogleAgent(): AdsGoogleAgent {
  return AdsGoogleAgent.instance();
}

export function resetAdsGoogleAgentForTests(): void {
  inst = null;
}
