import type { ILlmClient } from "../../LlmClient";
import type { VideoMarketingInput, VideoMarketingOutput } from "./shared";
import { getDefaultVideoMarketingLlm, runVideoMarketingAgentCore } from "./shared";

const AGENT_ID = "videomarketing-distribucion";

let inst: VideoMarketingDistribucionAgent | null = null;

export class VideoMarketingDistribucionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VideoMarketingDistribucionAgent {
    if (!inst) inst = new VideoMarketingDistribucionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVideoMarketingLlm();
  }

  async run(input: VideoMarketingInput): Promise<VideoMarketingOutput> {
    const eliteRole = "Eres **Video Marketing Distribución** — multicapa + plataformas.";
    const mission =
      "Define **pipeline distribución** (LUT/mograph, export por red, captions embebidos, APIs conectadas, calendario).";
    const fewShot =
      '{"result":"Checklist publish + hashtags","score":87,"recommendations":["UTM links","Rights metadata","Retry policy"]}';
    return runVideoMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVideoMarketingDistribucionAgent(): VideoMarketingDistribucionAgent {
  return VideoMarketingDistribucionAgent.instance();
}

export function resetVideoMarketingDistribucionAgentForTests(): void {
  inst = null;
}
