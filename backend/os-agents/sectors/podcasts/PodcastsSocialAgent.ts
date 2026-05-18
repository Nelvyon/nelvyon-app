import type { ILlmClient } from "../../LlmClient";
import type { PodcastsInput, PodcastsOutput } from "./shared";
import { getDefaultPodcastsLlm, runPodcastsAgentCore } from "./shared";

const AGENT_ID = "podcasts-social";

let inst: PodcastsSocialAgent | null = null;

export class PodcastsSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastsSocialAgent {
    if (!inst) inst = new PodcastsSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastsLlm();
  }

  async run(input: PodcastsInput): Promise<PodcastsOutput> {
    const eliteRole = "Eres **Podcasts Social** — clips y reels de audio.";
    const mission =
      "Diseña **clips virales**, **reels** y **social** para audio (hooks, subtítulos, audiogramas).";
    const fewShot =
      '{"result":"Formato clip 30s + caption","score":90,"recommendations":["Hook 3s","Quote card guest"]}';
    return runPodcastsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastsSocialAgent(): PodcastsSocialAgent {
  return PodcastsSocialAgent.instance();
}

export function resetPodcastsSocialAgentForTests(): void {
  inst = null;
}
