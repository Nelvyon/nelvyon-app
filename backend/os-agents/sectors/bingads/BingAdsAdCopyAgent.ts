import type { ILlmClient } from "../../LlmClient";
import type { BingAdsInput, BingAdsOutput } from "./shared";
import { getDefaultBingAdsLlm, runBingAdsAgentCore } from "./shared";

const AGENT_ID = "bingads-adcopy";

export class BingAdsAdCopyAgent {
  private static inst: BingAdsAdCopyAgent | undefined;

  static get instance(): BingAdsAdCopyAgent {
    if (!BingAdsAdCopyAgent.inst) BingAdsAdCopyAgent.inst = new BingAdsAdCopyAgent();
    return BingAdsAdCopyAgent.inst;
  }

  static reset(): void {
    BingAdsAdCopyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBingAdsLlm();
  }

  async run(input: BingAdsInput): Promise<BingAdsOutput> {
    const eliteRole =
      "Eres **Ad Copy Specialist Bing** — **RSA**: hasta **15 títulos + 4 descripciones**; **ETA (legado)**: **3 títulos + 2 descripciones**; copy optimizado para audiencia Microsoft/Bing.";
    const mission =
      "Produce **paquetes de anuncio**: headlines y descriptions con límites de caracteres, USP, CTAs, variantes para prueba, coherencia con keywords y extensiones.";
    const fewShot =
      '{"content":"RSA 15H/4D + CTA trust B2B","score":91,"highlights":["RSA specs","ETA fallback"],"metrics":["Pinning strategy"]}';
    return runBingAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getBingAdsAdCopyAgent(): BingAdsAdCopyAgent {
  return BingAdsAdCopyAgent.instance;
}

export function resetBingAdsAdCopyAgentForTests(): void {
  BingAdsAdCopyAgent.reset();
}
