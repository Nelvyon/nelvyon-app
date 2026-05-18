import type { ILlmClient } from "../../LlmClient";
import type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
import { getDefaultInfluencerReachLlm, runInfluencerReachAgentCore } from "./influencerReachShared";

const AGENT_ID = "influencer-discovery";

export class InfluencerDiscoveryAgent {
  private static inst: InfluencerDiscoveryAgent | undefined;

  static get instance(): InfluencerDiscoveryAgent {
    if (!InfluencerDiscoveryAgent.inst) InfluencerDiscoveryAgent.inst = new InfluencerDiscoveryAgent();
    return InfluencerDiscoveryAgent.inst;
  }

  static reset(): void {
    InfluencerDiscoveryAgent.inst = undefined;
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
          "ROLE: Director de talento y creator partnerships top 1%; mapeas perfiles por fit de audiencia, credibilidad y riesgo de marca.",
        mission:
          "Propón perfiles tipo (micro/macro), señales de autenticidad, formatos ganadores y lista priorizada con criterios de descarte.",
        fewShotExample: `Input: DTC skincare, audiencia 25-40 urbano, TikTok/IG, budget mid.
Output JSON: matriz de 5 arquetipos con rangos de seguidores, score 85, recommendations sobre UGC-first creators y validación de comentarios.`,
      },
      input,
    );
  }
}

export function getInfluencerDiscoveryAgent(): InfluencerDiscoveryAgent {
  return InfluencerDiscoveryAgent.instance;
}

export function resetInfluencerDiscoveryAgentForTests(): void {
  InfluencerDiscoveryAgent.reset();
}
