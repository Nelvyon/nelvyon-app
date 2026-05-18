import type { ILlmClient } from "../../LlmClient";
import type { InfluencerInput, InfluencerOutput } from "./shared";
import { getDefaultInfluencerLlm, runInfluencerAgentCore } from "./shared";

const AGENT_ID = "influencer-analytics";

let inst: InfluencerAnalyticsAgent | null = null;

export class InfluencerAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InfluencerAnalyticsAgent {
    if (!inst) inst = new InfluencerAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerLlm();
  }

  async run(input: InfluencerInput): Promise<InfluencerOutput> {
    const eliteRole = "Eres **Influencer Analytics** — crecimiento y optimización.";
    const mission =
      "Propón **métricas y tests** (engagement, saves, CTR enlaces, cohortes, optimización títulos/descripciones).";
    const fewShot =
      '{"result":"Dashboard KPI + 3 experimentos","score":88,"recommendations":["Hook A/B","Post time heatmap","Fan overlap"]}';
    return runInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInfluencerAnalyticsAgent(): InfluencerAnalyticsAgent {
  return InfluencerAnalyticsAgent.instance();
}

export function resetInfluencerAnalyticsAgentForTests(): void {
  inst = null;
}
