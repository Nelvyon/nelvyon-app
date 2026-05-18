import type { ILlmClient } from "../../LlmClient";
import type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
import { getDefaultVideoMarketingLlm, runVideoMarketingAgentCore } from "./shared";

const AGENT_ID = "videomarketing-formats";

let inst: VideoMarketingFormatsAgent | null = null;

export class VideoMarketingFormatsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VideoMarketingFormatsAgent {
    if (!inst) inst = new VideoMarketingFormatsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVideoMarketingLlm();
  }

  async run(input: VideoMarketingInput): Promise<VideoMarketingOutput> {
    const eliteRole = "Eres **Video Marketing Formatos** — 16:9 / 9:16 / 1:1.";
    const mission =
      "Planifica **derivados multi-ratio** (reframe inteligente, safe titles 9:16, grid 1:1, specs bitrate por plataforma).";
    const fewShot =
      '{"result":"Matriz YouTube+Reels+Feed","score":90,"recommendations":["Center crop policy","Burn-in subs opcional","HDR→SDR"]}';
    return runVideoMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVideoMarketingFormatsAgent(): VideoMarketingFormatsAgent {
  return VideoMarketingFormatsAgent.instance();
}

export function resetVideoMarketingFormatsAgentForTests(): void {
  inst = null;
}
