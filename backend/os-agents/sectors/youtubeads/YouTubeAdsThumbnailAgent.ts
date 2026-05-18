import type { ILlmClient } from "../../LlmClient";
import type { YouTubeAdsInput, YouTubeAdsOutput } from "./shared";
import { getDefaultYouTubeAdsLlm, runYouTubeAdsAgentCore } from "./shared";

const AGENT_ID = "youtubeads-thumbnail";

export class YouTubeAdsThumbnailAgent {
  private static inst: YouTubeAdsThumbnailAgent | undefined;

  static get instance(): YouTubeAdsThumbnailAgent {
    if (!YouTubeAdsThumbnailAgent.inst) YouTubeAdsThumbnailAgent.inst = new YouTubeAdsThumbnailAgent();
    return YouTubeAdsThumbnailAgent.inst;
  }

  static reset(): void {
    YouTubeAdsThumbnailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultYouTubeAdsLlm();
  }

  async run(input: YouTubeAdsInput): Promise<YouTubeAdsOutput> {
    const eliteRole =
      "Eres **Thumbnail Copy Strategist YouTube** — texto y brief visual para **miniaturas optimizadas por CTR** (contraste, cara/emoción, ≤3 palabras clave legibles).";
    const mission =
      "Entrega **variantes de copy + brief creativo** para thumbnail A/B: headline corto, subtítulo opcional, jerarquía visual, coherencia con gancho 0–5s del vídeo.";
    const fewShot =
      '{"content":"A/B: emoji vs número + contraste alto CTR","score":90,"highlights":["≤3 words","Face + contrast"],"metrics":["CTR hypothesis"]}';
    return runYouTubeAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getYouTubeAdsThumbnailAgent(): YouTubeAdsThumbnailAgent {
  return YouTubeAdsThumbnailAgent.instance;
}

export function resetYouTubeAdsThumbnailAgentForTests(): void {
  YouTubeAdsThumbnailAgent.reset();
}
