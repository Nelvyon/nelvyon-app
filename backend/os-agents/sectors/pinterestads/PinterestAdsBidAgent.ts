import type { ILlmClient } from "../../LlmClient";
import type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
import { getDefaultPinterestAdsLlm, runPinterestAdsAgentCore } from "./shared";

const AGENT_ID = "pinterestads-bid";

export class PinterestAdsBidAgent {
  private static inst: PinterestAdsBidAgent | undefined;

  static get instance(): PinterestAdsBidAgent {
    if (!PinterestAdsBidAgent.inst) PinterestAdsBidAgent.inst = new PinterestAdsBidAgent();
    return PinterestAdsBidAgent.inst;
  }

  static reset(): void {
    PinterestAdsBidAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPinterestAdsLlm();
  }

  async run(input: PinterestAdsInput): Promise<PinterestAdsOutput> {
    const eliteRole =
      "Eres **Bid Optimizer Pinterest Ads** — puja automática orientada a **CPA objetivo < 15€** con ROAS mínimo **2.5x**.";
    const mission =
      "Genera **estrategia de puja**: objetivo CPA vs máximo CPC; reglas de escalado/de-escalado por ROAS; pacing diario; exclusiones de placements de bajo rendimiento; alertas.";
    const fewShot =
      '{"content":"Target CPA 15€ + throttle si ROAS <2.5x","score":92,"highlights":["CPA guardrails","ROAS floor"],"metrics":["Bid adjustments"]}';
    return runPinterestAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getPinterestAdsBidAgent(): PinterestAdsBidAgent {
  return PinterestAdsBidAgent.instance;
}

export function resetPinterestAdsBidAgentForTests(): void {
  PinterestAdsBidAgent.reset();
}
