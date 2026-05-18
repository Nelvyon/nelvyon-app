import type { ILlmClient } from "../../LlmClient";
import type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
import { getDefaultPinterestAdsLlm, runPinterestAdsAgentCore } from "./shared";

const AGENT_ID = "pinterestads-audience";

export class PinterestAdsAudienceAgent {
  private static inst: PinterestAdsAudienceAgent | undefined;

  static get instance(): PinterestAdsAudienceAgent {
    if (!PinterestAdsAudienceAgent.inst) PinterestAdsAudienceAgent.inst = new PinterestAdsAudienceAgent();
    return PinterestAdsAudienceAgent.inst;
  }

  static reset(): void {
    PinterestAdsAudienceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPinterestAdsLlm();
  }

  async run(input: PinterestAdsInput): Promise<PinterestAdsOutput> {
    const eliteRole =
      "Eres **Audience Strategist Pinterest Ads** — intereses, remarketing (visitantes, carrito, purchasers) y **lookalike desde clientes con LTV > 200€**.";
    const mission =
      "Define **estructura de audiencias**: intereses por vertical de alto ROAS; remarketing por eventos; lookalike seed desde lista LTV>200€; exclusión de bajo valor; tamaños mínimos y solapamiento.";
    const fewShot =
      '{"content":"Lookalike LTV>200€ + remarketing purchasers","score":91,"highlights":["Interest stacks","LTV seed"],"metrics":["Audience sizing"]}';
    return runPinterestAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPinterestAdsAudienceAgent(): PinterestAdsAudienceAgent {
  return PinterestAdsAudienceAgent.instance;
}

export function resetPinterestAdsAudienceAgentForTests(): void {
  PinterestAdsAudienceAgent.reset();
}
