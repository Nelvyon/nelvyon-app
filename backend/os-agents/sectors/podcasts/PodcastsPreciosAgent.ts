import type { ILlmClient } from "../../LlmClient";
import type { PodcastsInput, PodcastsOutput } from "./shared";
import { getDefaultPodcastsLlm, runPodcastsAgentCore } from "./shared";

const AGENT_ID = "podcasts-precios";

let inst: PodcastsPreciosAgent | null = null;

export class PodcastsPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastsPreciosAgent {
    if (!inst) inst = new PodcastsPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastsLlm();
  }

  async run(input: PodcastsInput): Promise<PodcastsOutput> {
    const eliteRole = "Eres **Podcasts Precios** — publicidad y patrocinios.";
    const mission =
      "Diseña **pricing de publicidad** y **patrocinios** (CPM, bundles episodios, exclusividad de categoría).";
    const fewShot =
      '{"result":"Tarifario sponsor por reach","score":91,"recommendations":["Package 4 spots","Category exclusive"]}';
    return runPodcastsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastsPreciosAgent(): PodcastsPreciosAgent {
  return PodcastsPreciosAgent.instance();
}

export function resetPodcastsPreciosAgentForTests(): void {
  inst = null;
}
