import type { ILlmClient } from "../../LlmClient";
import type { AdsInput, AdsOutput } from "./shared";
import { getDefaultAdsLlm, runAdsAgentCore } from "./shared";

const AGENT_ID = "ads-attribution";

let inst: AdsAttributionAgent | null = null;

export class AdsAttributionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AdsAttributionAgent {
    if (!inst) inst = new AdsAttributionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAdsLlm();
  }

  async execute(input: AdsInput): Promise<AdsOutput> {
    return runAdsAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getAdsAttributionAgent(): AdsAttributionAgent {
  return AdsAttributionAgent.instance();
}

export function resetAdsAttributionAgentForTests(): void {
  inst = null;
}
