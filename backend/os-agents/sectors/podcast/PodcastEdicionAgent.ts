import type { ILlmClient } from "../../LlmClient";
import type { PodcastInput, PodcastOutput } from "./shared";
import { getDefaultPodcastLlm, runPodcastAgentCore } from "./shared";

const AGENT_ID = "podcast-edicion";

let inst: PodcastEdicionAgent | null = null;

export class PodcastEdicionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastEdicionAgent {
    if (!inst) inst = new PodcastEdicionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastLlm();
  }

  async run(input: PodcastInput): Promise<PodcastOutput> {
    const eliteRole = "Eres **Podcast Edición** — mezcla automática.";
    const mission =
      "Diseña **pipeline edición** (gate, EQ voz, compresión, de-clip, loudness, export MP3 128 + WAV master).";
    const fewShot =
      '{"result":"Chain FX + LUFS target","score":89,"recommendations":["Breath trim","Room tone fill","Limiter true peak"]}';
    return runPodcastAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastEdicionAgent(): PodcastEdicionAgent {
  return PodcastEdicionAgent.instance();
}

export function resetPodcastEdicionAgentForTests(): void {
  inst = null;
}
