import type { ILlmClient } from "../../LlmClient";
import type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
import { getDefaultPricingDinamicoLlm, runPricingDinamicoAgentCore } from "./shared";

const AGENT_ID = "pricingdinamico-personalizado";

let inst: PricingDinamicoPersonalizadoAgent | null = null;

export class PricingDinamicoPersonalizadoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PricingDinamicoPersonalizadoAgent {
    if (!inst) inst = new PricingDinamicoPersonalizadoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPricingDinamicoLlm();
  }

  async run(input: PricingDinamicoInput): Promise<PricingDinamicoOutput> {
    const eliteRole = "Eres **Pricing Dinámico Personalizado** — lista por cliente, región y canal.";
    const mission =
      "Diseña **matriz de precios personalizados** (RFM, geo, canal; opt-out; documentación para cliente B2B).";
    const fewShot =
      '{"result":"4 tiers precio + reglas elegibilidad","score":86,"recommendations":["GDPR/consent","Paridad contrato","No price discrimination prohibida"]}';
    return runPricingDinamicoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPricingDinamicoPersonalizadoAgent(): PricingDinamicoPersonalizadoAgent {
  return PricingDinamicoPersonalizadoAgent.instance();
}

export function resetPricingDinamicoPersonalizadoAgentForTests(): void {
  inst = null;
}
