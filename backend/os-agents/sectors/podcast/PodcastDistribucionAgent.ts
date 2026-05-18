import type { ILlmClient } from "../../LlmClient";
import type { PodcastInput, PodcastOutput } from "./shared";
import { getDefaultPodcastLlm, runPodcastAgentCore } from "./shared";

const AGENT_ID = "podcast-distribucion";

let inst: PodcastDistribucionAgent | null = null;

export class PodcastDistribucionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastDistribucionAgent {
    if (!inst) inst = new PodcastDistribucionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastLlm();
  }

  async run(input: PodcastInput): Promise<PodcastOutput> {
    const eliteRole = "Eres **Podcast Distribución** — Spotify / Apple / iVoox.";
    const mission =
      "Define **paquete distribución** (RSS tags, categorías, artwork 3000px, episodio draft, GUID strategy).";
    const fewShot =
      '{"result":"Checklist publish 3 plataformas","score":87,"recommendations":["Episode type","Explicit flag","Trailer link"]}';
    return runPodcastAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastDistribucionAgent(): PodcastDistribucionAgent {
  return PodcastDistribucionAgent.instance();
}

export function resetPodcastDistribucionAgentForTests(): void {
  inst = null;
}
