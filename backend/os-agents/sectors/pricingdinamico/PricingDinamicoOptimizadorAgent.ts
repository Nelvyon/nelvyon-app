import type { ILlmClient } from "../../LlmClient";
import type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
import { getDefaultPricingDinamicoLlm, runPricingDinamicoAgentCore } from "./shared";

const AGENT_ID = "pricingdinamico-optimizador";

let inst: PricingDinamicoOptimizadorAgent | null = null;

export class PricingDinamicoOptimizadorAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PricingDinamicoOptimizadorAgent {
    if (!inst) inst = new PricingDinamicoOptimizadorAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPricingDinamicoLlm();
  }

  async run(input: PricingDinamicoInput): Promise<PricingDinamicoOutput> {
    const eliteRole = "Eres **Pricing Dinámico Optimizador** — precio vs demanda en vivo con guardrails.";
    const mission =
      "Define **política de repricing** (señales demanda, stock, cohorte; límites min/max; rollback si caída conversión).";
    const fewShot =
      '{"result":"Reglas 5 triggers + cap diario ±3%","score":89,"recommendations":["Log auditoría","Fairness B2B","Congelar en promos legales"]}';
    return runPricingDinamicoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPricingDinamicoOptimizadorAgent(): PricingDinamicoOptimizadorAgent {
  return PricingDinamicoOptimizadorAgent.instance();
}

export function resetPricingDinamicoOptimizadorAgentForTests(): void {
  inst = null;
}
