import type { ILlmClient } from "../../LlmClient";
import type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
import { getDefaultVideoMarketingLlm, runVideoMarketingAgentCore } from "./shared";

const AGENT_ID = "videomarketing-presentador";

let inst: VideoMarketingPresentadorAgent | null = null;

export class VideoMarketingPresentadorAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VideoMarketingPresentadorAgent {
    if (!inst) inst = new VideoMarketingPresentadorAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVideoMarketingLlm();
  }

  async run(input: VideoMarketingInput): Promise<VideoMarketingOutput> {
    const eliteRole = "Eres **Video Marketing Presentador** — HeyGen v3 premium.";
    const mission =
      "Define **brief presentador IA** (avatar tier, cadencia, mirada cámara, teleprompter, plan B voz-off).";
    const fewShot =
      '{"result":"Script cámara + marcas agua","score":88,"recommendations":["Consentimiento imagen","Latencia sync","Brand kit"]}';
    return runVideoMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVideoMarketingPresentadorAgent(): VideoMarketingPresentadorAgent {
  return VideoMarketingPresentadorAgent.instance();
}

export function resetVideoMarketingPresentadorAgentForTests(): void {
  inst = null;
}
