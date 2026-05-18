import type { ILlmClient } from "../../LlmClient";
import type { AdsInput, AdsOutput } from "./shared";
import { getDefaultAdsLlm, runAdsAgentCore } from "./shared";

const AGENT_ID = "ads-meta";

let inst: AdsMetaAgent | null = null;

export class AdsMetaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AdsMetaAgent {
    if (!inst) inst = new AdsMetaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAdsLlm();
  }

  async execute(input: AdsInput): Promise<AdsOutput> {
    return runAdsAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getAdsMetaAgent(): AdsMetaAgent {
  return AdsMetaAgent.instance();
}

export function resetAdsMetaAgentForTests(): void {
  inst = null;
}
