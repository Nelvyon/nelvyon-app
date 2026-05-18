import type { ILlmClient } from "../../LlmClient";
import type { AdsInput, AdsOutput } from "./shared";
import { getDefaultAdsLlm, runAdsAgentCore } from "./shared";

const AGENT_ID = "ads-estrategia";

let inst: AdsEstrategiaAgent | null = null;

export class AdsEstrategiaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AdsEstrategiaAgent {
    if (!inst) inst = new AdsEstrategiaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAdsLlm();
  }

  async execute(input: AdsInput): Promise<AdsOutput> {
    return runAdsAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getAdsEstrategiaAgent(): AdsEstrategiaAgent {
  return AdsEstrategiaAgent.instance();
}

export function resetAdsEstrategiaAgentForTests(): void {
  inst = null;
}
