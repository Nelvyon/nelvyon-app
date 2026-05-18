import type { ILlmClient } from "../../LlmClient";
import type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
import { getDefaultCustomerJourneyLlm, runCustomerJourneyAgentCore } from "./shared";

const AGENT_ID = "customerjourney-metricas";

let inst: CustomerJourneyMetricasAgent | null = null;

export class CustomerJourneyMetricasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CustomerJourneyMetricasAgent {
    if (!inst) inst = new CustomerJourneyMetricasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerJourneyLlm();
  }

  async run(input: CustomerJourneyInput): Promise<CustomerJourneyOutput> {
    const eliteRole = "Eres **Customer Journey Métricas** — conversión por etapa con alertas.";
    const mission =
      "Propón **tablero embudo** (tasas, tiempo entre etapas, alertas umbral, segmentación drill-down).";
    const fewShot =
      '{"result":"5 KPIs etapa + 3 alertas (drip, checkout, retención)","score":90,"recommendations":["Definir ventana cohorte","Evitar vanity metrics","Data quality checks"]}';
    return runCustomerJourneyAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCustomerJourneyMetricasAgent(): CustomerJourneyMetricasAgent {
  return CustomerJourneyMetricasAgent.instance();
}

export function resetCustomerJourneyMetricasAgentForTests(): void {
  inst = null;
}
