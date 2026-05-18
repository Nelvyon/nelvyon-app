import type { ILlmClient } from "../../LlmClient";
import type { PodcastsInput, PodcastsOutput } from "./shared";
import { getDefaultPodcastsLlm, runPodcastsAgentCore } from "./shared";

const AGENT_ID = "podcasts-email";

let inst: PodcastsEmailAgent | null = null;

export class PodcastsEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastsEmailAgent {
    if (!inst) inst = new PodcastsEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastsLlm();
  }

  async run(input: PodcastsInput): Promise<PodcastsOutput> {
    const eliteRole = "Eres **Podcasts Email** — newsletter y comunidad.";
    const mission =
      "Diseña **newsletter** y **comunidad de oyentes** (drops de episodio, behind-the-scenes, encuestas).";
    const fewShot =
      '{"result":"Secuencia lanzamiento episodio 3 mails","score":91,"recommendations":["Snippet audio embebido","Segment premium"]}';
    return runPodcastsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastsEmailAgent(): PodcastsEmailAgent {
  return PodcastsEmailAgent.instance();
}

export function resetPodcastsEmailAgentForTests(): void {
  inst = null;
}
