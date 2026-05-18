import type { ILlmClient } from "../../LlmClient";
import type { AdsInput, AdsOutput } from "./shared";
import { getDefaultAdsLlm, runAdsAgentCore } from "./shared";

const AGENT_ID = "ads-audiencias";

let inst: AdsAudienciasAgent | null = null;

export class AdsAudienciasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AdsAudienciasAgent {
    if (!inst) inst = new AdsAudienciasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAdsLlm();
  }

  async execute(input: AdsInput): Promise<AdsOutput> {
    return runAdsAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getAdsAudienciasAgent(): AdsAudienciasAgent {
  return AdsAudienciasAgent.instance();
}

export function resetAdsAudienciasAgentForTests(): void {
  inst = null;
}
