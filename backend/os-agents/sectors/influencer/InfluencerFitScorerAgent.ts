import type { ILlmClient } from "../../LlmClient";
import type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
import { getDefaultInfluencerReachLlm, runInfluencerReachAgentCore } from "./influencerReachShared";

const AGENT_ID = "influencer-fit-scorer";

export class InfluencerFitScorerAgent {
  private static inst: InfluencerFitScorerAgent | undefined;

  static get instance(): InfluencerFitScorerAgent {
    if (!InfluencerFitScorerAgent.inst) InfluencerFitScorerAgent.inst = new InfluencerFitScorerAgent();
    return InfluencerFitScorerAgent.inst;
  }

  static reset(): void {
    InfluencerFitScorerAgent.inst = undefined;
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
          "ROLE: Brand safety y scoring cuantitativo-cualitativo top 1%; defines pesos para audiencia, valores, contenido y performance.",
        mission:
          "Devuelve score 0–100 de alineación marca–influencer con subscores explicados y banderas rojas.",
        fewShotExample: `Input: marca family-friendly vs creator historias humor adulto.
Output JSON: score global 34 con breakdown; recommendations sobre creators alternativos y cláusulas de contenido.`,
      },
      input,
    );
  }
}

export function getInfluencerFitScorerAgent(): InfluencerFitScorerAgent {
  return InfluencerFitScorerAgent.instance;
}

export function resetInfluencerFitScorerAgentForTests(): void {
  InfluencerFitScorerAgent.reset();
}
