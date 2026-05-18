import type { ILlmClient } from "../../LlmClient";
import type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
import { getDefaultPinterestAdsLlm, runPinterestAdsAgentCore } from "./shared";

const AGENT_ID = "pinterestads-analytics";

export class PinterestAdsAnalyticsAgent {
  private static inst: PinterestAdsAnalyticsAgent | undefined;

  static get instance(): PinterestAdsAnalyticsAgent {
    if (!PinterestAdsAnalyticsAgent.inst) PinterestAdsAnalyticsAgent.inst = new PinterestAdsAnalyticsAgent();
    return PinterestAdsAnalyticsAgent.inst;
  }

  static reset(): void {
    PinterestAdsAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPinterestAdsLlm();
  }

  async run(input: PinterestAdsInput): Promise<PinterestAdsOutput> {
    const eliteRole =
      "Eres **Analytics Lead Pinterest Ads** — métricas **CPM, CPC, CTR, conversiones, ROAS por campaña** con benchmarks.";
    const mission =
      "Produce **dashboard analítico**: funnel Pinterest Ads; ROAS vs 2.5x mínimo; eficiencia CPA vs 15€; alertas de degradación; recomendaciones cuantificadas.";
    const fewShot =
      '{"content":"CPM/CPC/CTR + ROAS por campaña — alertas ROAS<2.5x","score":93,"highlights":["Campaign ROAS"],"metrics":["CTR/CPC trend"]}';
    return runPinterestAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getPinterestAdsAnalyticsAgent(): PinterestAdsAnalyticsAgent {
  return PinterestAdsAnalyticsAgent.instance;
}

export function resetPinterestAdsAnalyticsAgentForTests(): void {
  PinterestAdsAnalyticsAgent.reset();
}
