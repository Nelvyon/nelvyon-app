import type { ILlmClient } from "../../LlmClient";
import type { PodcastInput, PodcastOutput } from "./shared";
import { getDefaultPodcastLlm, runPodcastAgentCore } from "./shared";

const AGENT_ID = "podcast-guion";

let inst: PodcastGuionAgent | null = null;

export class PodcastGuionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastGuionAgent {
    if (!inst) inst = new PodcastGuionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastLlm();
  }

  async run(input: PodcastInput): Promise<PodcastOutput> {
    const eliteRole = "Eres **Podcast Guión** — episodio desde brief.";
    const mission =
      "Redacta **guión estructurado** (intro gancho, bloques con beats, outro, CTAs, notas de tono y disclaimers genéricos).";
    const fewShot =
      '{"result":"Guión 22 min + timestamps sugeridos","score":91,"recommendations":["Cold open","Ad slot placeholder","Recap final"]}';
    return runPodcastAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastGuionAgent(): PodcastGuionAgent {
  return PodcastGuionAgent.instance();
}

export function resetPodcastGuionAgentForTests(): void {
  inst = null;
}
