import type { ILlmClient } from "../../LlmClient";
import type { AdsInput, AdsOutput } from "./shared";
import { getDefaultAdsLlm, runAdsAgentCore } from "./shared";

const AGENT_ID = "ads-tiktok";

let inst: AdsTiktokAgent | null = null;

export class AdsTiktokAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AdsTiktokAgent {
    if (!inst) inst = new AdsTiktokAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAdsLlm();
  }

  async execute(input: AdsInput): Promise<AdsOutput> {
    return runAdsAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getAdsTiktokAgent(): AdsTiktokAgent {
  return AdsTiktokAgent.instance();
}

export function resetAdsTiktokAgentForTests(): void {
  inst = null;
}
