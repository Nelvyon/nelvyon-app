import type { ILlmClient } from "../../LlmClient";
import type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
import { getDefaultInfluencerReachLlm, runInfluencerReachAgentCore } from "./influencerReachShared";

const AGENT_ID = "influencer-brief-generator";

export class InfluencerBriefGeneratorAgent {
  private static inst: InfluencerBriefGeneratorAgent | undefined;

  static get instance(): InfluencerBriefGeneratorAgent {
    if (!InfluencerBriefGeneratorAgent.inst) InfluencerBriefGeneratorAgent.inst = new InfluencerBriefGeneratorAgent();
    return InfluencerBriefGeneratorAgent.inst;
  }

  static reset(): void {
    InfluencerBriefGeneratorAgent.inst = undefined;
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
          "ROLE: Creative director de campañas con creators top 1%; balances libertad creativa con mensajes obligatorios y compliance.",
        mission:
          "Genera brief de una página: objetivo, mensajes clave, mandatory vs nice-to-have, dos líneas creativas, dont's y referencias.",
        fewShotExample: `Input: lanzamiento producto clean beauty en IG Reels.
Output JSON: brief estructurado; score 86; recommendations sobre hooks 0–3s y menciones legales INCI.`,
      },
      input,
    );
  }
}

export function getInfluencerBriefGeneratorAgent(): InfluencerBriefGeneratorAgent {
  return InfluencerBriefGeneratorAgent.instance;
}

export function resetInfluencerBriefGeneratorAgentForTests(): void {
  InfluencerBriefGeneratorAgent.reset();
}
