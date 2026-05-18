import type { ILlmClient } from "../../LlmClient";
import type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
import { getDefaultPricingDinamicoLlm, runPricingDinamicoAgentCore } from "./shared";

const AGENT_ID = "pricingdinamico-abtest";

let inst: PricingDinamicoAbTestAgent | null = null;

export class PricingDinamicoAbTestAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PricingDinamicoAbTestAgent {
    if (!inst) inst = new PricingDinamicoAbTestAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPricingDinamicoLlm();
  }

  async run(input: PricingDinamicoInput): Promise<PricingDinamicoOutput> {
    const eliteRole = "Eres **Pricing Dinámico A/B Test** — hallazgo de precio óptimo con ética.";
    const mission =
      "Planifica **experimento de precio** (diseño, exposición, métrica primaria margen o conversión, parada segura).";
    const fewShot =
      '{"result":"Test 3 brazos 14d con mínimo n/celda","score":88,"recommendations":["No ocultar precio final","Evitar surcharges ocultos","Comunicar si legal"]}';
    return runPricingDinamicoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPricingDinamicoAbTestAgent(): PricingDinamicoAbTestAgent {
  return PricingDinamicoAbTestAgent.instance();
}

export function resetPricingDinamicoAbTestAgentForTests(): void {
  inst = null;
}
