import type { ILlmClient } from "../../LlmClient";
import type { PodcastsInput, PodcastsOutput } from "./shared";
import { getDefaultPodcastsLlm, runPodcastsAgentCore } from "./shared";

const AGENT_ID = "podcasts-reviews";

let inst: PodcastsReviewsAgent | null = null;

export class PodcastsReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastsReviewsAgent {
    if (!inst) inst = new PodcastsReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastsLlm();
  }

  async run(input: PodcastsInput): Promise<PodcastsOutput> {
    const eliteRole = "Eres **Podcasts Reviews** — plataformas y reputación.";
    const mission =
      "Diseña **reviews en plataformas** y **reputación** del show (ratings Apple/Spotify, testimonios, crisis leve).";
    const fewShot =
      '{"result":"Playbook pedir review sin spam","score":90,"recommendations":["CTA outro","Reply comentarios"]}';
    return runPodcastsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastsReviewsAgent(): PodcastsReviewsAgent {
  return PodcastsReviewsAgent.instance();
}

export function resetPodcastsReviewsAgentForTests(): void {
  inst = null;
}
