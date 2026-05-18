import type { ILlmClient } from "../../LlmClient";
import type { AdsInput, AdsOutput } from "./shared";
import { getDefaultAdsLlm, runAdsAgentCore } from "./shared";

const AGENT_ID = "ads-optimizacion";

let inst: AdsOptimizacionAgent | null = null;

export class AdsOptimizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AdsOptimizacionAgent {
    if (!inst) inst = new AdsOptimizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAdsLlm();
  }

  async execute(input: AdsInput): Promise<AdsOutput> {
    return runAdsAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getAdsOptimizacionAgent(): AdsOptimizacionAgent {
  return AdsOptimizacionAgent.instance();
}

export function resetAdsOptimizacionAgentForTests(): void {
  inst = null;
}
