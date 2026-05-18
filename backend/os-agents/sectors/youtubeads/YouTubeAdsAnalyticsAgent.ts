import type { ILlmClient } from "../../LlmClient";
import type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
import { getDefaultYouTubeAdsLlm, runYouTubeAdsAgentCore } from "./shared";

const AGENT_ID = "youtubeads-analytics";

export class YouTubeAdsAnalyticsAgent {
  private static inst: YouTubeAdsAnalyticsAgent | undefined;

  static get instance(): YouTubeAdsAnalyticsAgent {
    if (!YouTubeAdsAnalyticsAgent.inst) YouTubeAdsAnalyticsAgent.inst = new YouTubeAdsAnalyticsAgent();
    return YouTubeAdsAnalyticsAgent.inst;
  }

  static reset(): void {
    YouTubeAdsAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultYouTubeAdsLlm();
  }

  async run(input: YouTubeAdsInput): Promise<YouTubeAdsOutput> {
    const eliteRole =
      "Eres **Analytics Lead YouTube Ads** — métricas **CPV, view rate, skip rate, brand lift** (cuando hay estudios) con benchmarks por vertical.";
    const mission =
      "Produce **dashboard analítico**: funnel vídeo; CPV vs 0.03€; VTR vs 30%; ROAS vs 2x; correlación thumbnail CTR ↔ VTR; recomendaciones cuantificadas.";
    const fewShot =
      '{"content":"CPV + view rate + skip rate por placement","score":93,"highlights":["Brand lift proxy"],"metrics":["Skip rate alert"]}';
    return runYouTubeAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getYouTubeAdsAnalyticsAgent(): YouTubeAdsAnalyticsAgent {
  return YouTubeAdsAnalyticsAgent.instance;
}

export function resetYouTubeAdsAnalyticsAgentForTests(): void {
  YouTubeAdsAnalyticsAgent.reset();
}
