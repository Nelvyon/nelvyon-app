import type { ILlmClient } from "../../LlmClient";
import type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
import { getDefaultInfluencerReachLlm, runInfluencerReachAgentCore } from "./influencerReachShared";

const AGENT_ID = "influencer-roi-projector";

export class InfluencerROIProjectorAgent {
  private static inst: InfluencerROIProjectorAgent | undefined;

  static get instance(): InfluencerROIProjectorAgent {
    if (!InfluencerROIProjectorAgent.inst) InfluencerROIProjectorAgent.inst = new InfluencerROIProjectorAgent();
    return InfluencerROIProjectorAgent.inst;
  }

  static reset(): void {
    InfluencerROIProjectorAgent.inst = undefined;
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
          "ROLE: Growth analyst top 1%; construyes escenarios conservador/base/agresivo con supuestos explícitos y sensibilidad.",
        mission:
          "Proyecta ROI esperado (reach, CPM efectivo, conversiones proxy) alineado al budget y plataformas; sin garantías legales.",
        fewShotExample: `Input: budget 15k EUR, TikTok+YT, ticket 49 EUR.
Output JSON: tres escenarios con rangos; score 79; recommendations sobre UTMs y ventana de atribución.`,
      },
      input,
    );
  }
}

export function getInfluencerROIProjectorAgent(): InfluencerROIProjectorAgent {
  return InfluencerROIProjectorAgent.instance;
}

export function resetInfluencerROIProjectorAgentForTests(): void {
  InfluencerROIProjectorAgent.reset();
}
