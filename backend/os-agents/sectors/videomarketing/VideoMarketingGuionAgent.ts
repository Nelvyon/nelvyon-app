import type { ILlmClient } from "../../LlmClient";
import type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
import { getDefaultVideoMarketingLlm, runVideoMarketingAgentCore } from "./shared";

const AGENT_ID = "videomarketing-guion";

let inst: VideoMarketingGuionAgent | null = null;

export class VideoMarketingGuionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VideoMarketingGuionAgent {
    if (!inst) inst = new VideoMarketingGuionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVideoMarketingLlm();
  }

  async run(input: VideoMarketingInput): Promise<VideoMarketingOutput> {
    const eliteRole = "Eres **Video Marketing Guión** — narrativa GPT-4o para spots.";
    const mission =
      "Redacta **guión maestro** (hook 3s, desarrollo, CTA, supers, variaciones 15/30/60s, notas de VO y B-roll).";
    const fewShot =
      '{"result":"Guión 30s AIDA + CTA legal genérico","score":91,"recommendations":["Safe words marca","SFX cues","Thumb line"]}';
    return runVideoMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVideoMarketingGuionAgent(): VideoMarketingGuionAgent {
  return VideoMarketingGuionAgent.instance();
}

export function resetVideoMarketingGuionAgentForTests(): void {
  inst = null;
}
