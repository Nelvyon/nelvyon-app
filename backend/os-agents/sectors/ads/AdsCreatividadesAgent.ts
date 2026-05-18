import type { ILlmClient } from "../../LlmClient";
import type { AdsInput, AdsOutput } from "./shared";
import { getDefaultAdsLlm, runAdsAgentCore } from "./shared";

const AGENT_ID = "ads-creatividades";

let inst: AdsCreatividadesAgent | null = null;

export class AdsCreatividadesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AdsCreatividadesAgent {
    if (!inst) inst = new AdsCreatividadesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAdsLlm();
  }

  async execute(input: AdsInput): Promise<AdsOutput> {
    return runAdsAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getAdsCreatividadesAgent(): AdsCreatividadesAgent {
  return AdsCreatividadesAgent.instance();
}

export function resetAdsCreatividadesAgentForTests(): void {
  inst = null;
}
