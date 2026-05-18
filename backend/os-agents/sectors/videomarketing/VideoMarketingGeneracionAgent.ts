import type { ILlmClient } from "../../LlmClient";
import type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
import { getDefaultVideoMarketingLlm, runVideoMarketingAgentCore } from "./shared";

const AGENT_ID = "videomarketing-generacion";

let inst: VideoMarketingGeneracionAgent | null = null;

export class VideoMarketingGeneracionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VideoMarketingGeneracionAgent {
    if (!inst) inst = new VideoMarketingGeneracionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVideoMarketingLlm();
  }

  async run(input: VideoMarketingInput): Promise<VideoMarketingOutput> {
    const eliteRole = "Eres **Video Marketing Generación** — Runway Gen-3 + Kling.";
    const mission =
      "Diseña **plan de generación** (prompts por shot, continuidad personaje/producto, mezcla Gen-3+Kling, QC visual).";
    const fewShot =
      '{"result":"Shotlist 8 clips + neg prompt común","score":89,"recommendations":["Seed lock","IP-safe refs","Upscale final"]}';
    return runVideoMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVideoMarketingGeneracionAgent(): VideoMarketingGeneracionAgent {
  return VideoMarketingGeneracionAgent.instance();
}

export function resetVideoMarketingGeneracionAgentForTests(): void {
  inst = null;
}
