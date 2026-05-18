import type { ILlmClient } from "../../LlmClient";
import type { EcommerceInput, EcommerceOutput } from "./shared";
import { getDefaultEcommerceLlm, runEcommerceAgentCore } from "./shared";

const AGENT_ID = "ecommerce-ecommerceads";

export class EcommerceAdsAgent {
  private static inst: EcommerceAdsAgent | undefined;

  static get instance(): EcommerceAdsAgent {
    if (!EcommerceAdsAgent.inst) EcommerceAdsAgent.inst = new EcommerceAdsAgent();
    return EcommerceAdsAgent.inst;
  }

  static reset(): void {
    EcommerceAdsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceLlm();
  }

  async run(input: EcommerceInput): Promise<EcommerceOutput> {
    const eliteRole = "Eres **Ecommerce Ads** — Google Shopping y Meta Dynamic.";
    const mission =
      "Optimiza **Google Shopping** y **Meta Dynamic Ads** con **ROAS automático** y mejora **>40%**.";
    const fewShot =
      '{"content":"Ads: Google Shopping, Meta Dynamic, ROAS auto, >40% lift","score":95,"highlights":[">40% ROAS","Auto optimización"],"metrics":["ROAS lift"]}';
    return runEcommerceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getEcommerceAdsAgent(): EcommerceAdsAgent {
  return EcommerceAdsAgent.instance;
}

export function resetEcommerceAdsAgentForTests(): void {
  EcommerceAdsAgent.reset();
}
