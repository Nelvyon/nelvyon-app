import type { ILlmClient } from "../../LlmClient";
import type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
import { getDefaultPricingDinamicoLlm, runPricingDinamicoAgentCore } from "./shared";

const AGENT_ID = "pricingdinamico-descuentos";

let inst: PricingDinamicoDescuentosAgent | null = null;

export class PricingDinamicoDescuentosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PricingDinamicoDescuentosAgent {
    if (!inst) inst = new PricingDinamicoDescuentosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPricingDinamicoLlm();
  }

  async run(input: PricingDinamicoInput): Promise<PricingDinamicoOutput> {
    const eliteRole = "Eres **Pricing Dinámico Descuentos** — incentivos por comportamiento sin canibalizar.";
    const mission =
      "Orquesta **descuentos automáticos** (abandono carrito, win-back, volumen; techos; exclusión MAP).";
    const fewShot =
      '{"result":"3 reglas carrito + cadencia win-back 30/60d","score":85,"recommendations":["Stacking limits","Transparencia IVA","No discriminación prohibida"]}';
    return runPricingDinamicoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPricingDinamicoDescuentosAgent(): PricingDinamicoDescuentosAgent {
  return PricingDinamicoDescuentosAgent.instance();
}

export function resetPricingDinamicoDescuentosAgentForTests(): void {
  inst = null;
}
