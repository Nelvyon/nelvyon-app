import type { ILlmClient } from "../../LlmClient";
import type { PodcastsInput, PodcastsOutput } from "./shared";
import { getDefaultPodcastsLlm, runPodcastsAgentCore } from "./shared";

const AGENT_ID = "podcasts-analytics";

let inst: PodcastsAnalyticsAgent | null = null;

export class PodcastsAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastsAnalyticsAgent {
    if (!inst) inst = new PodcastsAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastsLlm();
  }

  async run(input: PodcastsInput): Promise<PodcastsOutput> {
    const eliteRole = "Eres **Podcasts Analytics** — descargas y CPM.";
    const mission =
      "Diseña **analytics de descargas**, **retención** por episodio y **CPM** / rendimiento de sponsors.";
    const fewShot =
      '{"result":"North Star downloads + completion rate","score":92,"recommendations":["Cohort por fuente","Drop-off min 5"]}';
    return runPodcastsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastsAnalyticsAgent(): PodcastsAnalyticsAgent {
  return PodcastsAnalyticsAgent.instance();
}

export function resetPodcastsAnalyticsAgentForTests(): void {
  inst = null;
}
