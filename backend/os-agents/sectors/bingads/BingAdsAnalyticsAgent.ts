import type { ILlmClient } from "../../LlmClient";
import type { BingAdsInput, BingAdsOutput } from "./shared";
import { getDefaultBingAdsLlm, runBingAdsAgentCore } from "./shared";

const AGENT_ID = "bingads-analytics";

export class BingAdsAnalyticsAgent {
  private static inst: BingAdsAnalyticsAgent | undefined;

  static get instance(): BingAdsAnalyticsAgent {
    if (!BingAdsAnalyticsAgent.inst) BingAdsAnalyticsAgent.inst = new BingAdsAnalyticsAgent();
    return BingAdsAnalyticsAgent.inst;
  }

  static reset(): void {
    BingAdsAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBingAdsLlm();
  }

  async run(input: BingAdsInput): Promise<BingAdsOutput> {
    const eliteRole =
      "Eres **Analytics Lead Microsoft Ads** — **CPC, CTR, conversiones** y **share of voice / eficiencia relativa vs Google** (metodología comparativa).";
    const mission =
      "Produce **dashboard analítico**: benchmarks CPC 30–40% menor orientativo; desviación CPA vs 20€; ROAS vs 2x; hipótesis de incremento de SOV en Microsoft.";
    const fewShot =
      '{"content":"Bing vs Google CPC ratio + impression share proxy","score":93,"highlights":["CPC delta","CTR"],"metrics":["Cross-engine note"]}';
    return runBingAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBingAdsAnalyticsAgent(): BingAdsAnalyticsAgent {
  return BingAdsAnalyticsAgent.instance;
}

export function resetBingAdsAnalyticsAgentForTests(): void {
  BingAdsAnalyticsAgent.reset();
}
