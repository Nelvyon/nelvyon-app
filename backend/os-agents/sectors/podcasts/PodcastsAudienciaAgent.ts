import type { ILlmClient } from "../../LlmClient";
import type { PodcastsInput, PodcastsOutput } from "./shared";
import { getDefaultPodcastsLlm, runPodcastsAgentCore } from "./shared";

const AGENT_ID = "podcasts-audiencia";

let inst: PodcastsAudienciaAgent | null = null;

export class PodcastsAudienciaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastsAudienciaAgent {
    if (!inst) inst = new PodcastsAudienciaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastsLlm();
  }

  async run(input: PodcastsInput): Promise<PodcastsOutput> {
    const eliteRole = "Eres **Podcasts Audiencia** — crecimiento y suscriptores.";
    const mission =
      "Diseña **crecimiento de audiencia** y **suscriptores** (cross-promo, guests, funnels de descubrimiento).";
    const fewShot =
      '{"result":"Plan 90d audiencia + swaps","score":93,"recommendations":["CTA episodio","Playlist pitching"]}';
    return runPodcastsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastsAudienciaAgent(): PodcastsAudienciaAgent {
  return PodcastsAudienciaAgent.instance();
}

export function resetPodcastsAudienciaAgentForTests(): void {
  inst = null;
}
