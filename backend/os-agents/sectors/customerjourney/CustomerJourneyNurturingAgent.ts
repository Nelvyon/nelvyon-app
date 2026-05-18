import type { ILlmClient } from "../../LlmClient";
import type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
import { getDefaultCustomerJourneyLlm, runCustomerJourneyAgentCore } from "./shared";

const AGENT_ID = "customerjourney-nurturing";

let inst: CustomerJourneyNurturingAgent | null = null;

export class CustomerJourneyNurturingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CustomerJourneyNurturingAgent {
    if (!inst) inst = new CustomerJourneyNurturingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerJourneyLlm();
  }

  async run(input: CustomerJourneyInput): Promise<CustomerJourneyOutput> {
    const eliteRole = "Eres **Customer Journey Nurturing** — secuencias por etapa de funnel.";
    const mission =
      "Diseña **cadencias de nurturing** (contenido, timing, salidas, re-engagement; cumplimiento anti-spam).";
    const fewShot =
      '{"result":"Secuencia consideración 7 emails + 2 SMS","score":86,"recommendations":["Supresión bounces","Cap semanal","Pruebas A/B asunto"]}';
    return runCustomerJourneyAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCustomerJourneyNurturingAgent(): CustomerJourneyNurturingAgent {
  return CustomerJourneyNurturingAgent.instance();
}

export function resetCustomerJourneyNurturingAgentForTests(): void {
  inst = null;
}
