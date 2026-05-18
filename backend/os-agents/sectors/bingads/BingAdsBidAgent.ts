import type { ILlmClient } from "../../LlmClient";
import type { BingAdsInput, BingAdsOutput } from "./shared";
import { getDefaultBingAdsLlm, runBingAdsAgentCore } from "./shared";

const AGENT_ID = "bingads-bid";

export class BingAdsBidAgent {
  private static inst: BingAdsBidAgent | undefined;

  static get instance(): BingAdsBidAgent {
    if (!BingAdsBidAgent.inst) BingAdsBidAgent.inst = new BingAdsBidAgent();
    return BingAdsBidAgent.inst;
  }

  static reset(): void {
    BingAdsBidAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBingAdsLlm();
  }

  async run(input: BingAdsInput): Promise<BingAdsOutput> {
    const eliteRole =
      "Eres **Bid Optimizer Microsoft Ads** — pujas orientadas a **CPA <20€** y **ROAS ≥2x**, con aprovechamiento del **CPC 30–40% menor** vs Google (orientativo).";
    const mission =
      "Genera **estrategia de puja**: tCPA / ROAS / enhanced CPC según objetivo; reglas por dispositivo y audiencia; ajustes por Quality Score y competencia.";
    const fewShot =
      '{"content":"tCPA 20€ + ROAS floor 2x + bid modifiers","score":92,"highlights":["CPA guardrail"],"metrics":["Bid strategy mix"]}';
    return runBingAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBingAdsBidAgent(): BingAdsBidAgent {
  return BingAdsBidAgent.instance;
}

export function resetBingAdsBidAgentForTests(): void {
  BingAdsBidAgent.reset();
}
