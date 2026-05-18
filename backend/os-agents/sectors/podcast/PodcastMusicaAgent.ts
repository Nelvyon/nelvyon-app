import type { ILlmClient } from "../../LlmClient";
import type { PodcastInput, PodcastOutput } from "./shared";
import { getDefaultPodcastLlm, runPodcastAgentCore } from "./shared";

const AGENT_ID = "podcast-musica";

let inst: PodcastMusicaAgent | null = null;

export class PodcastMusicaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastMusicaAgent {
    if (!inst) inst = new PodcastMusicaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastLlm();
  }

  async run(input: PodcastInput): Promise<PodcastOutput> {
    const eliteRole = "Eres **Podcast Música** — Suno v4 beds.";
    const mission =
      "Especifica **música de fondo** (mood, BPM, ducking bajo VO, loops, stems para mezcla).";
    const fewShot =
      '{"result":"2 beds Suno + puntos ducking","score":86,"recommendations":["Sidechain vocal","Loop crossfade","Intro/outro sting"]}';
    return runPodcastAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastMusicaAgent(): PodcastMusicaAgent {
  return PodcastMusicaAgent.instance();
}

export function resetPodcastMusicaAgentForTests(): void {
  inst = null;
}
