import type { ILlmClient } from "../../LlmClient";
import type { PodcastInput, PodcastOutput } from "./shared";
import { getDefaultPodcastLlm, runPodcastAgentCore } from "./shared";

const AGENT_ID = "podcast-analytics";

let inst: PodcastAnalyticsAgent | null = null;

export class PodcastAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastAnalyticsAgent {
    if (!inst) inst = new PodcastAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastLlm();
  }

  async run(input: PodcastInput): Promise<PodcastOutput> {
    const eliteRole = "Eres **Podcast Analytics** — audiencia y metadata.";
    const mission =
      "Propón **optimización** (títulos A/B, descripciones, retention hooks, segmentos de audiencia, KPIs escucha).";
    const fewShot =
      '{"result":"Matriz títulos + hipótesis CTR","score":86,"recommendations":["Drop-off minuto 2","Chapter markers","Shorts tease"]}';
    return runPodcastAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastAnalyticsAgent(): PodcastAnalyticsAgent {
  return PodcastAnalyticsAgent.instance();
}

export function resetPodcastAnalyticsAgentForTests(): void {
  inst = null;
}
