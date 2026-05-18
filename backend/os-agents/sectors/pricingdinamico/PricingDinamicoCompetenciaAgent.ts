import type { ILlmClient } from "../../LlmClient";
import type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
import { getDefaultPricingDinamicoLlm, runPricingDinamicoAgentCore } from "./shared";

const AGENT_ID = "pricingdinamico-competencia";

let inst: PricingDinamicoCompetenciaAgent | null = null;

export class PricingDinamicoCompetenciaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PricingDinamicoCompetenciaAgent {
    if (!inst) inst = new PricingDinamicoCompetenciaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPricingDinamicoLlm();
  }

  async run(input: PricingDinamicoInput): Promise<PricingDinamicoOutput> {
    const eliteRole = "Eres **Pricing Dinámico Competencia** — alertas ante movimientos rivales.";
    const mission =
      "Define **umbrales y playbooks** cuando competidores mueven precio (respuesta, espera, matching selectivo).";
    const fewShot =
      '{"result":"Alerta -8% rival SKU top: 3 opciones respuesta","score":87,"recommendations":["Verificar promo temporal","Margin floor","Legal predatory pricing"]}';
    return runPricingDinamicoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPricingDinamicoCompetenciaAgent(): PricingDinamicoCompetenciaAgent {
  return PricingDinamicoCompetenciaAgent.instance();
}

export function resetPricingDinamicoCompetenciaAgentForTests(): void {
  inst = null;
}
