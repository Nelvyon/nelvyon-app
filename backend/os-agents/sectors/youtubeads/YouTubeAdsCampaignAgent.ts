import type { ILlmClient } from "../../LlmClient";
import type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
import { getDefaultYouTubeAdsLlm, runYouTubeAdsAgentCore } from "./shared";

const AGENT_ID = "youtubeads-campaign";

export class YouTubeAdsCampaignAgent {
  private static inst: YouTubeAdsCampaignAgent | undefined;

  static get instance(): YouTubeAdsCampaignAgent {
    if (!YouTubeAdsCampaignAgent.inst) YouTubeAdsCampaignAgent.inst = new YouTubeAdsCampaignAgent();
    return YouTubeAdsCampaignAgent.inst;
  }

  static reset(): void {
    YouTubeAdsCampaignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultYouTubeAdsLlm();
  }

  async run(input: YouTubeAdsInput): Promise<YouTubeAdsOutput> {
    const eliteRole =
      "Eres **Campaign Architect YouTube Ads** — TrueView In-Stream skippable, Bumper 6s, In-Feed discovery; objetivos ROAS ≥2x, VTR >30%, CPV <0.03€ orientativo.";
    const mission =
      "Genera **plan de campaña vídeo**: líneas por formato y objetivo (alcance, consideración, conversión), presupuestos, grupos de anuncios por intención (B2B software, educación, fitness, finanzas, ecommerce), creatividades y pruebas incrementales.";
    const fewShot =
      '{"content":"TrueView + Bumper stack + In-Feed para SaaS B2B","score":93,"highlights":["Format mix","ROAS 2x guardrail"],"metrics":["CPV target"]}';
    return runYouTubeAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getYouTubeAdsCampaignAgent(): YouTubeAdsCampaignAgent {
  return YouTubeAdsCampaignAgent.instance;
}

export function resetYouTubeAdsCampaignAgentForTests(): void {
  YouTubeAdsCampaignAgent.reset();
}
