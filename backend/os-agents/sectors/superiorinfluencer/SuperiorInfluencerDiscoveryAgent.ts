import type { ILlmClient } from "../../LlmClient";
import type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
import { getDefaultSuperiorInfluencerLlm, runSuperiorInfluencerAgentCore } from "./shared";

const AGENT_ID = "superiorinfluencer-discovery";

export class SuperiorInfluencerDiscoveryAgent {
  private static inst: SuperiorInfluencerDiscoveryAgent | undefined;

  static get instance(): SuperiorInfluencerDiscoveryAgent {
    if (!SuperiorInfluencerDiscoveryAgent.inst) {
      SuperiorInfluencerDiscoveryAgent.inst = new SuperiorInfluencerDiscoveryAgent();
    }
    return SuperiorInfluencerDiscoveryAgent.inst;
  }

  static reset(): void {
    SuperiorInfluencerDiscoveryAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorInfluencerLlm();
  }

  async run(input: SuperiorInfluencerInput): Promise<SuperiorInfluencerOutput> {
    const eliteRole = "Eres **SuperiorInfluencer Discovery Lead** — nicho, audiencia y fit.";
    const mission =
      "Busca influencers por **nicho/audiencia/plataforma** y **scoring fit de marca**; enriquecimiento automático de base.";
    const fewShot =
      '{"content":"Influencer shortlist by niche + brand fit score","score":89,"highlights":["Brand fit","Auto enrich"],"metrics":["Discovery matches"]}';
    return runSuperiorInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getSuperiorInfluencerDiscoveryAgent(): SuperiorInfluencerDiscoveryAgent {
  return SuperiorInfluencerDiscoveryAgent.instance;
}

export function resetSuperiorInfluencerDiscoveryAgentForTests(): void {
  SuperiorInfluencerDiscoveryAgent.reset();
}
