import type { ILlmClient } from "../../LlmClient";
import type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
import { getDefaultPinterestAdsLlm, runPinterestAdsAgentCore } from "./shared";

const AGENT_ID = "pinterestads-campaign";

export class PinterestAdsCampaignAgent {
  private static inst: PinterestAdsCampaignAgent | undefined;

  static get instance(): PinterestAdsCampaignAgent {
    if (!PinterestAdsCampaignAgent.inst) PinterestAdsCampaignAgent.inst = new PinterestAdsCampaignAgent();
    return PinterestAdsCampaignAgent.inst;
  }

  static reset(): void {
    PinterestAdsCampaignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPinterestAdsLlm();
  }

  async run(input: PinterestAdsInput): Promise<PinterestAdsOutput> {
    const eliteRole =
      "Eres **Campaign Architect Pinterest Ads** — campañas Traffic / Catalog / Conversion con objetivos ROAS ≥ 2.5x y CPA < 15€ orientativo.";
    const mission =
      "Genera **plan de campaña Pinterest Ads**: objetivos (consideración, conversión), presupuesto diario/total, grupos de anuncios por vertical (moda, hogar, recetas, bodas, fitness, viajes, educación), creatividades Pin 1000×1500 con CTA obligatorio, pruebas A/B y guardrails de rendimiento.";
    const fewShot =
      '{"content":"Campaña Conversion + ROAS guardrail 2.5x + Pins 1000×1500","score":93,"highlights":["Catalog segments","Pin specs"],"metrics":["CPA target <15€"]}';
    return runPinterestAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPinterestAdsCampaignAgent(): PinterestAdsCampaignAgent {
  return PinterestAdsCampaignAgent.instance;
}

export function resetPinterestAdsCampaignAgentForTests(): void {
  PinterestAdsCampaignAgent.reset();
}
