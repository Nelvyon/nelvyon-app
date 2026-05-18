import type { ILlmClient } from "../../LlmClient";
import type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
import { getDefaultPricingDinamicoLlm, runPricingDinamicoAgentCore } from "./shared";

const AGENT_ID = "pricingdinamico-elasticidad";

let inst: PricingDinamicoElasticidadAgent | null = null;

export class PricingDinamicoElasticidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PricingDinamicoElasticidadAgent {
    if (!inst) inst = new PricingDinamicoElasticidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPricingDinamicoLlm();
  }

  async run(input: PricingDinamicoInput): Promise<PricingDinamicoOutput> {
    const eliteRole = "Eres **Pricing Dinámico Elasticidad** — curvas por segmento.";
    const mission =
      "Estima **elasticidad precio-demanda** por segmento (intervalos de confianza, datos escasos, estacionalidad).";
    const fewShot =
      '{"result":"Elasticidad -0.8 SMB vs -1.2 consumer","score":87,"recommendations":["Más datos A/B","Separar marca/private label","Revisar outliers"]}';
    return runPricingDinamicoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPricingDinamicoElasticidadAgent(): PricingDinamicoElasticidadAgent {
  return PricingDinamicoElasticidadAgent.instance();
}

export function resetPricingDinamicoElasticidadAgentForTests(): void {
  inst = null;
}
