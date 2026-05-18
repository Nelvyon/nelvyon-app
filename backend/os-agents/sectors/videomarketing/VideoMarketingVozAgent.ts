import type { ILlmClient } from "../../LlmClient";
import type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
import { getDefaultVideoMarketingLlm, runVideoMarketingAgentCore } from "./shared";

const AGENT_ID = "videomarketing-voz";

let inst: VideoMarketingVozAgent | null = null;

export class VideoMarketingVozAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VideoMarketingVozAgent {
    if (!inst) inst = new VideoMarketingVozAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVideoMarketingLlm();
  }

  async run(input: VideoMarketingInput): Promise<VideoMarketingOutput> {
    const eliteRole = "Eres **Video Marketing Voz** — ElevenLabs voz en off.";
    const mission =
      "Produce **dirección de voz** (casting, pacing, SSML breaks, loudness -14 LUFS target, doblaje vs VO limpio).";
    const fewShot =
      '{"result":"Casting 2 voces + SSML sample","score":87,"recommendations":["Breath control","Plosives EQ","Silence trim"]}';
    return runVideoMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVideoMarketingVozAgent(): VideoMarketingVozAgent {
  return VideoMarketingVozAgent.instance();
}

export function resetVideoMarketingVozAgentForTests(): void {
  inst = null;
}
