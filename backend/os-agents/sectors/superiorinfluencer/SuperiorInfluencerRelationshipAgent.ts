import type { ILlmClient } from "../../LlmClient";
import type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
import { getDefaultSuperiorInfluencerLlm, runSuperiorInfluencerAgentCore } from "./shared";

const AGENT_ID = "superiorinfluencer-relationship";

export class SuperiorInfluencerRelationshipAgent {
  private static inst: SuperiorInfluencerRelationshipAgent | undefined;

  static get instance(): SuperiorInfluencerRelationshipAgent {
    if (!SuperiorInfluencerRelationshipAgent.inst) {
      SuperiorInfluencerRelationshipAgent.inst = new SuperiorInfluencerRelationshipAgent();
    }
    return SuperiorInfluencerRelationshipAgent.inst;
  }

  static reset(): void {
    SuperiorInfluencerRelationshipAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorInfluencerLlm();
  }

  async run(input: SuperiorInfluencerInput): Promise<SuperiorInfluencerOutput> {
    const eliteRole = "Eres **SuperiorInfluencer Relationship CRM** — historial y embajadores.";
    const mission =
      "**CRM influencers**: historial de colaboraciones, **tier VIP** y **programa embajadores** a largo plazo.";
    const fewShot =
      '{"content":"Influencer CRM history VIP tier ambassador program","score":87,"highlights":["VIP tier","Ambassador"],"metrics":["Creator LTV"]}';
    return runSuperiorInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getSuperiorInfluencerRelationshipAgent(): SuperiorInfluencerRelationshipAgent {
  return SuperiorInfluencerRelationshipAgent.instance;
}

export function resetSuperiorInfluencerRelationshipAgentForTests(): void {
  SuperiorInfluencerRelationshipAgent.reset();
}
