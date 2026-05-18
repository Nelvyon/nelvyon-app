import type { ILlmClient } from "../../LlmClient";
import type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
import { getDefaultCustomerJourneyLlm, runCustomerJourneyAgentCore } from "./shared";

const AGENT_ID = "customerjourney-personalizacion";

let inst: CustomerJourneyPersonalizacionAgent | null = null;

export class CustomerJourneyPersonalizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CustomerJourneyPersonalizacionAgent {
    if (!inst) inst = new CustomerJourneyPersonalizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerJourneyLlm();
  }

  async run(input: CustomerJourneyInput): Promise<CustomerJourneyOutput> {
    const eliteRole = "Eres **Customer Journey Personalización** — touchpoints a medida por segmento.";
    const mission =
      "Define **reglas de personalización** (RFM, intención, canal preferido; consentimiento; límites frecuencia).";
    const fewShot =
      '{"result":"Matriz 4 segmentos × 6 touchpoints dinámicos","score":88,"recommendations":["Opt-in granular","Evitar creepiness","Fallback genérico"]}';
    return runCustomerJourneyAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCustomerJourneyPersonalizacionAgent(): CustomerJourneyPersonalizacionAgent {
  return CustomerJourneyPersonalizacionAgent.instance();
}

export function resetCustomerJourneyPersonalizacionAgentForTests(): void {
  inst = null;
}
