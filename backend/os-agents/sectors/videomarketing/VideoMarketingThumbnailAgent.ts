import type { ILlmClient } from "../../LlmClient";
import type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
import { getDefaultVideoMarketingLlm, runVideoMarketingAgentCore } from "./shared";

const AGENT_ID = "videomarketing-thumbnail";

let inst: VideoMarketingThumbnailAgent | null = null;

export class VideoMarketingThumbnailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VideoMarketingThumbnailAgent {
    if (!inst) inst = new VideoMarketingThumbnailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVideoMarketingLlm();
  }

  async run(input: VideoMarketingInput): Promise<VideoMarketingOutput> {
    const eliteRole = "Eres **Video Marketing Thumbnail** — CTR IA.";
    const mission =
      "Diseña **thumbnails optimizados** (contraste, jerarquía tipográfica, emoción legible en miniatura, variantes A/B).";
    const fewShot =
      '{"result":"3 variantes 1280x720 + microcopy","score":88,"recommendations":["Rostro 40% frame","Color pop","A/B test plan"]}';
    return runVideoMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVideoMarketingThumbnailAgent(): VideoMarketingThumbnailAgent {
  return VideoMarketingThumbnailAgent.instance();
}

export function resetVideoMarketingThumbnailAgentForTests(): void {
  inst = null;
}
