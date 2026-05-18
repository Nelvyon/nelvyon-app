import type { ILlmClient } from "../../LlmClient";
import type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
import { getDefaultPinterestAdsLlm, runPinterestAdsAgentCore } from "./shared";

const AGENT_ID = "pinterestads-keyword";

export class PinterestAdsKeywordAgent {
  private static inst: PinterestAdsKeywordAgent | undefined;

  static get instance(): PinterestAdsKeywordAgent {
    if (!PinterestAdsKeywordAgent.inst) PinterestAdsKeywordAgent.inst = new PinterestAdsKeywordAgent();
    return PinterestAdsKeywordAgent.inst;
  }

  static reset(): void {
    PinterestAdsKeywordAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPinterestAdsLlm();
  }

  async run(input: PinterestAdsInput): Promise<PinterestAdsOutput> {
    const eliteRole =
      "Eres **Keyword & Trends Researcher Pinterest** — descubrimiento de **keywords y tendencias** para targeting y copy Pin.";
    const mission =
      "Entrega **lista priorizada**: términos de búsqueda Pinterest, tendencias estacionales por vertical (moda, hogar, recetas, bodas, fitness, viajes, educación), ideas negativas y expansión semántica.";
    const fewShot =
      '{"content":"Trend keywords bodas Q2 + negative list","score":89,"highlights":["Seasonal peaks"],"metrics":["Intent tiers"]}';
    return runPinterestAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getPinterestAdsKeywordAgent(): PinterestAdsKeywordAgent {
  return PinterestAdsKeywordAgent.instance;
}

export function resetPinterestAdsKeywordAgentForTests(): void {
  PinterestAdsKeywordAgent.reset();
}
