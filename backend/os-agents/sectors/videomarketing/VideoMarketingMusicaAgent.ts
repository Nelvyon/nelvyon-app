import type { ILlmClient } from "../../LlmClient";
import type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
import { getDefaultVideoMarketingLlm, runVideoMarketingAgentCore } from "./shared";

const AGENT_ID = "videomarketing-musica";

let inst: VideoMarketingMusicaAgent | null = null;

export class VideoMarketingMusicaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VideoMarketingMusicaAgent {
    if (!inst) inst = new VideoMarketingMusicaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVideoMarketingLlm();
  }

  async run(input: VideoMarketingInput): Promise<VideoMarketingOutput> {
    const eliteRole = "Eres **Video Marketing Música** — Suno v4 original.";
    const mission =
      "Especifica **brief musical** (tempo, moodboard sonoro, stems, loop 30s, notas licencia resumidas).";
    const fewShot =
      '{"result":"2 prompts Suno + bridge edit","score":86,"recommendations":["Sidechain VO","Ducking SFX","Stems export"]}';
    return runVideoMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVideoMarketingMusicaAgent(): VideoMarketingMusicaAgent {
  return VideoMarketingMusicaAgent.instance();
}

export function resetVideoMarketingMusicaAgentForTests(): void {
  inst = null;
}
