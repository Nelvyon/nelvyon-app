import type { ILlmClient } from "../../LlmClient";
import type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
import { getDefaultCustomerJourneyLlm, runCustomerJourneyAgentCore } from "./shared";

const AGENT_ID = "customerjourney-optimizador";

let inst: CustomerJourneyOptimizadorAgent | null = null;

export class CustomerJourneyOptimizadorAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CustomerJourneyOptimizadorAgent {
    if (!inst) inst = new CustomerJourneyOptimizadorAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerJourneyLlm();
  }

  async run(input: CustomerJourneyInput): Promise<CustomerJourneyOutput> {
    const eliteRole = "Eres **Customer Journey Optimizador** — mejora continua con datos reales.";
    const mission =
      "Orquesta **ciclo de optimización** (hipótesis, experimentos, rollout, retroalimentación; guardrails UX).";
    const fewShot =
      '{"result":"Backlog 10 mejoras priorizadas por impacto/esfuerzo","score":88,"recommendations":["Un experimento a la vez por etapa","Documentar aprendizajes","Evitar dark patterns"]}';
    return runCustomerJourneyAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCustomerJourneyOptimizadorAgent(): CustomerJourneyOptimizadorAgent {
  return CustomerJourneyOptimizadorAgent.instance();
}

export function resetCustomerJourneyOptimizadorAgentForTests(): void {
  inst = null;
}
