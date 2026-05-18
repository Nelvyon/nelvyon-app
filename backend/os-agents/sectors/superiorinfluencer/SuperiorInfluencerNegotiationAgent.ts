import type { ILlmClient } from "../../LlmClient";
import type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
import { getDefaultSuperiorInfluencerLlm, runSuperiorInfluencerAgentCore } from "./shared";

const AGENT_ID = "superiorinfluencer-negotiation";

export class SuperiorInfluencerNegotiationAgent {
  private static inst: SuperiorInfluencerNegotiationAgent | undefined;

  static get instance(): SuperiorInfluencerNegotiationAgent {
    if (!SuperiorInfluencerNegotiationAgent.inst) {
      SuperiorInfluencerNegotiationAgent.inst = new SuperiorInfluencerNegotiationAgent();
    }
    return SuperiorInfluencerNegotiationAgent.inst;
  }

  static reset(): void {
    SuperiorInfluencerNegotiationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorInfluencerLlm();
  }

  async run(input: SuperiorInfluencerInput): Promise<SuperiorInfluencerOutput> {
    const eliteRole = "Eres **SuperiorInfluencer Negotiation Advisor** — tiers y contrapropuestas.";
    const mission =
      "Briefings de **negociación**, **rangos de precios por tier** y **contrapropuestas** alineadas a ROI **>300%**.";
    const fewShot =
      '{"content":"Tier pricing bands + counter-offer brief","score":86,"highlights":["Tier pricing","Counter-offer"],"metrics":["Deal range"]}';
    return runSuperiorInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSuperiorInfluencerNegotiationAgent(): SuperiorInfluencerNegotiationAgent {
  return SuperiorInfluencerNegotiationAgent.instance;
}

export function resetSuperiorInfluencerNegotiationAgentForTests(): void {
  SuperiorInfluencerNegotiationAgent.reset();
}
