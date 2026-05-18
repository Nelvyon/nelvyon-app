import type { ILlmClient } from "../../LlmClient";
import type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
import { getDefaultInfluencerReachLlm, runInfluencerReachAgentCore } from "./influencerReachShared";

const AGENT_ID = "influencer-contract-terms";

export class InfluencerContractTermsAgent {
  private static inst: InfluencerContractTermsAgent | undefined;

  static get instance(): InfluencerContractTermsAgent {
    if (!InfluencerContractTermsAgent.inst) InfluencerContractTermsAgent.inst = new InfluencerContractTermsAgent();
    return InfluencerContractTermsAgent.inst;
  }

  static reset(): void {
    InfluencerContractTermsAgent.inst = undefined;
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
          "ROLE: Especialista en acuerdos creator–marca (no abogado); plantillas claras de alcance, plazos y uso de contenido.",
        mission:
          "Sugiere términos: entregables, revisiones, exclusividad, derechos orgánico/paid, FTC/AENA disclosure, kill fee.",
        fewShotExample: `Input: campaña 90 días 4 reels + 8 stories whitelisting ligero.
Output JSON: checklist contractual; score 81; recommendations sobre límites de boosting y sublicencias.`,
      },
      input,
    );
  }
}

export function getInfluencerContractTermsAgent(): InfluencerContractTermsAgent {
  return InfluencerContractTermsAgent.instance;
}

export function resetInfluencerContractTermsAgentForTests(): void {
  InfluencerContractTermsAgent.reset();
}
