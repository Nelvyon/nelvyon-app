import type { ILlmClient } from "../../LlmClient";
import type { PodcastsInput, PodcastsOutput } from "./shared";
import { getDefaultPodcastsLlm, runPodcastsAgentCore } from "./shared";

const AGENT_ID = "podcasts-monetizacion";

let inst: PodcastsMonetizacionAgent | null = null;

export class PodcastsMonetizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastsMonetizacionAgent {
    if (!inst) inst = new PodcastsMonetizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastsLlm();
  }

  async run(input: PodcastsInput): Promise<PodcastsOutput> {
    const eliteRole = "Eres **Podcasts Monetización** — sponsors y premium.";
    const mission =
      "Diseña **monetización**: **sponsors**, **membresías** y **contenido premium** (mid-rolls, Patreon, bonus).";
    const fewShot =
      '{"result":"Media kit + tiers membresía","score":92,"recommendations":["Host-read ads","Early access audio"]}';
    return runPodcastsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastsMonetizacionAgent(): PodcastsMonetizacionAgent {
  return PodcastsMonetizacionAgent.instance();
}

export function resetPodcastsMonetizacionAgentForTests(): void {
  inst = null;
}
