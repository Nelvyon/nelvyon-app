import type { ILlmClient } from "../../LlmClient";
import type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
import { getDefaultInfluencerReachLlm, runInfluencerReachAgentCore } from "./influencerReachShared";

const AGENT_ID = "influencer-content-calendar";

export class InfluencerContentCalendarAgent {
  private static inst: InfluencerContentCalendarAgent | undefined;

  static get instance(): InfluencerContentCalendarAgent {
    if (!InfluencerContentCalendarAgent.inst) InfluencerContentCalendarAgent.inst = new InfluencerContentCalendarAgent();
    return InfluencerContentCalendarAgent.inst;
  }

  static reset(): void {
    InfluencerContentCalendarAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerReachLlm();
  }

  async run(input: InfluencerReachInput): Promise<InfluencerReachOutput> {
    return runInfluencerReachAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Social strategist top 1%; diseñas cadencias multi-touch sin saturar al público ni al algoritmo.",
        mission:
          "Crea calendario 4–6 semanas con formato por día, hook, CTA y variante A/B donde aplique.",
        fewShotExample: `Input: IG + TikTok campaña awareness.
Output JSON: tabla semanal por bloques; score 84; recommendations sobre spacing entre posts patrocinados y orgánicos.`,
      },
      input,
    );
  }
}

export function getInfluencerContentCalendarAgent(): InfluencerContentCalendarAgent {
  return InfluencerContentCalendarAgent.instance;
}

export function resetInfluencerContentCalendarAgentForTests(): void {
  InfluencerContentCalendarAgent.reset();
}
