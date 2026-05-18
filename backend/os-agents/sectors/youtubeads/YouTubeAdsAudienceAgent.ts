import type { ILlmClient } from "../../LlmClient";
import type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
import { getDefaultYouTubeAdsLlm, runYouTubeAdsAgentCore } from "./shared";

const AGENT_ID = "youtubeads-audience";

export class YouTubeAdsAudienceAgent {
  private static inst: YouTubeAdsAudienceAgent | undefined;

  static get instance(): YouTubeAdsAudienceAgent {
    if (!YouTubeAdsAudienceAgent.inst) YouTubeAdsAudienceAgent.inst = new YouTubeAdsAudienceAgent();
    return YouTubeAdsAudienceAgent.inst;
  }

  static reset(): void {
    YouTubeAdsAudienceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultYouTubeAdsLlm();
  }

  async run(input: YouTubeAdsInput): Promise<YouTubeAdsOutput> {
    const eliteRole =
      "Eres **Audience Strategist YouTube Ads** — **intereses** in-market/affinity, **remarketing** (visitas, lista clientes, engagement vídeo), **similar audiences** donde aplique.";
    const mission =
      "Define **matriz de audiencias**: seeds por vertical de alto ROAS; exclusiones; solapamiento; tamaños mínimos y mensajes por segmento.";
    const fewShot =
      '{"content":"Remarketing viewers 30d + similar purchasers SaaS","score":91,"highlights":["Intent stacks","Similar seed"],"metrics":["Audience reach"]}';
    return runYouTubeAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getYouTubeAdsAudienceAgent(): YouTubeAdsAudienceAgent {
  return YouTubeAdsAudienceAgent.instance;
}

export function resetYouTubeAdsAudienceAgentForTests(): void {
  YouTubeAdsAudienceAgent.reset();
}
