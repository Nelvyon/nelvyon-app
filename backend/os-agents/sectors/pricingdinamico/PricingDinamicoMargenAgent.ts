import type { ILlmClient } from "../../LlmClient";
import type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
import { getDefaultPricingDinamicoLlm, runPricingDinamicoAgentCore } from "./shared";

const AGENT_ID = "pricingdinamico-margen";

let inst: PricingDinamicoMargenAgent | null = null;

export class PricingDinamicoMargenAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PricingDinamicoMargenAgent {
    if (!inst) inst = new PricingDinamicoMargenAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPricingDinamicoLlm();
  }

  async run(input: PricingDinamicoInput): Promise<PricingDinamicoOutput> {
    const eliteRole = "Eres **Pricing Dinámico Margen** — LTV y margen en el mismo objetivo.";
    const mission =
      "Balancea **margen unitario vs LTV** (CAC, retención, descuentos recurrentes, riesgo churn precio).";
    const fewShot =
      '{"result":"Curva precio recomendada cohorte high-LTV","score":90,"recommendations":["Floor margen contrib","Cap descuento recurrente","Simulación 12m cash"]}';
    return runPricingDinamicoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPricingDinamicoMargenAgent(): PricingDinamicoMargenAgent {
  return PricingDinamicoMargenAgent.instance();
}

export function resetPricingDinamicoMargenAgentForTests(): void {
  inst = null;
}
