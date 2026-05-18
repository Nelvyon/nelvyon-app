import type { ILlmClient } from "../../LlmClient";
import type { PodcastInput, PodcastOutput } from "./shared";
import { getDefaultPodcastLlm, runPodcastAgentCore } from "./shared";

const AGENT_ID = "podcast-transcripcion";

let inst: PodcastTranscripcionAgent | null = null;

export class PodcastTranscripcionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastTranscripcionAgent {
    if (!inst) inst = new PodcastTranscripcionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastLlm();
  }

  async run(input: PodcastInput): Promise<PodcastOutput> {
    const eliteRole = "Eres **Podcast Transcripción** — Whisper + show notes SEO.";
    const mission =
      "Genera **show notes** con transcripción estructurada (timestamps, H2, keywords, enlaces internos sugeridos).";
    const fewShot =
      '{"result":"Show notes 800 palabras + capítulos","score":90,"recommendations":["Speaker labels","Pull quotes","FAQ schema light"]}';
    return runPodcastAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastTranscripcionAgent(): PodcastTranscripcionAgent {
  return PodcastTranscripcionAgent.instance();
}

export function resetPodcastTranscripcionAgentForTests(): void {
  inst = null;
}
