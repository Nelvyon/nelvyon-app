import type { ILlmClient } from "../../LlmClient";
import type { BingAdsInput, BingAdsOutput } from "./shared";
import { getDefaultBingAdsLlm, runBingAdsAgentCore } from "./shared";

const AGENT_ID = "bingads-keyword";

export class BingAdsKeywordAgent {
  private static inst: BingAdsKeywordAgent | undefined;

  static get instance(): BingAdsKeywordAgent {
    if (!BingAdsKeywordAgent.inst) BingAdsKeywordAgent.inst = new BingAdsKeywordAgent();
    return BingAdsKeywordAgent.inst;
  }

  static reset(): void {
    BingAdsKeywordAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBingAdsLlm();
  }

  async run(input: BingAdsInput): Promise<BingAdsOutput> {
    const eliteRole =
      "Eres **Keyword Strategist Bing** — investigación y **expansión de keywords** para Microsoft Search (match types, negatives, sinónimos B2B/legal/salud).";
    const mission =
      "Entrega **mapa de keywords**: core vs long-tail, intención, negatives, oportunidades de menor CPC vs Google, agrupación por ad group.";
    const fewShot =
      '{"content":"B2B SaaS negatives + Bing-specific variants","score":90,"highlights":["Match mix","Negatives"],"metrics":["Expansion tiers"]}';
    return runBingAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getBingAdsKeywordAgent(): BingAdsKeywordAgent {
  return BingAdsKeywordAgent.instance;
}

export function resetBingAdsKeywordAgentForTests(): void {
  BingAdsKeywordAgent.reset();
}
