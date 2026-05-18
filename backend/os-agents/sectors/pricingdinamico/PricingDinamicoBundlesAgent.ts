import type { ILlmClient } from "../../LlmClient";
import type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
import { getDefaultPricingDinamicoLlm, runPricingDinamicoAgentCore } from "./shared";

const AGENT_ID = "pricingdinamico-bundles";

let inst: PricingDinamicoBundlesAgent | null = null;

export class PricingDinamicoBundlesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PricingDinamicoBundlesAgent {
    if (!inst) inst = new PricingDinamicoBundlesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPricingDinamicoLlm();
  }

  async run(input: PricingDinamicoInput): Promise<PricingDinamicoOutput> {
    const eliteRole = "Eres **Pricing Dinámico Bundles** — upsell dinámico con margen conjunto.";
    const mission =
      "Propón **bundles y upsells** (compatibilidad inventario, elasticidad cruzada, ancla de precio).";
    const fewShot =
      '{"result":"Bundle A+B -12% vs suma carrito + upsell C","score":88,"recommendations":["Evitar devaluar flagship","Log cannibalización","Límite stock conjunto"]}';
    return runPricingDinamicoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPricingDinamicoBundlesAgent(): PricingDinamicoBundlesAgent {
  return PricingDinamicoBundlesAgent.instance();
}

export function resetPricingDinamicoBundlesAgentForTests(): void {
  inst = null;
}
