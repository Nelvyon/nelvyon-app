import type { ILlmClient } from "../../LlmClient";
import type { PodcastInput, PodcastOutput } from "./shared";
import { getDefaultPodcastLlm, runPodcastAgentCore } from "./shared";

const AGENT_ID = "podcast-voz";

let inst: PodcastVozAgent | null = null;

export class PodcastVozAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastVozAgent {
    if (!inst) inst = new PodcastVozAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastLlm();
  }

  async run(input: PodcastInput): Promise<PodcastOutput> {
    const eliteRole = "Eres **Podcast Voz** — ElevenLabs multi-speaker.";
    const mission =
      "Define **plan de voz** (casting A/B, alternancia hablantes, SSML pausas, loudness podcast, export stems).";
    const fewShot =
      '{"result":"Mapa hablantes + muestras línea","score":88,"recommendations":["De-esser","Noise floor","Chapter tone"]}';
    return runPodcastAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastVozAgent(): PodcastVozAgent {
  return PodcastVozAgent.instance();
}

export function resetPodcastVozAgentForTests(): void {
  inst = null;
}
