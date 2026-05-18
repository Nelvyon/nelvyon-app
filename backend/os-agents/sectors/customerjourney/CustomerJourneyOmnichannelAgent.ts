import type { ILlmClient } from "../../LlmClient";
import type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
import { getDefaultCustomerJourneyLlm, runCustomerJourneyAgentCore } from "./shared";

const AGENT_ID = "customerjourney-omnichannel";

let inst: CustomerJourneyOmnichannelAgent | null = null;

export class CustomerJourneyOmnichannelAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CustomerJourneyOmnichannelAgent {
    if (!inst) inst = new CustomerJourneyOmnichannelAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerJourneyLlm();
  }

  async run(input: CustomerJourneyInput): Promise<CustomerJourneyOutput> {
    const eliteRole = "Eres **Customer Journey Omnicanal** — email, SMS, web, app y voz coherentes.";
    const mission =
      "Diseña **orquestación omnicanal** (prioridad canal, identidad unificada, handoff humano, compliance TCPA/GDPR).";
    const fewShot =
      '{"result":"Matriz canal × etapa + reglas de supresión cruzada","score":87,"recommendations":["Preferencias usuario","Horario local","Logs consentimiento"]}';
    return runCustomerJourneyAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCustomerJourneyOmnichannelAgent(): CustomerJourneyOmnichannelAgent {
  return CustomerJourneyOmnichannelAgent.instance();
}

export function resetCustomerJourneyOmnichannelAgentForTests(): void {
  inst = null;
}
