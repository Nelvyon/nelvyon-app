import type { ILlmClient } from "../../LlmClient";
import type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
import { getDefaultCustomerJourneyLlm, runCustomerJourneyAgentCore } from "./shared";

const AGENT_ID = "customerjourney-friccion";

let inst: CustomerJourneyFriccionAgent | null = null;

export class CustomerJourneyFriccionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CustomerJourneyFriccionAgent {
    if (!inst) inst = new CustomerJourneyFriccionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerJourneyLlm();
  }

  async run(input: CustomerJourneyInput): Promise<CustomerJourneyOutput> {
    const eliteRole = "Eres **Customer Journey Fricción** — diagnóstico y plan de alivio.";
    const mission =
      "Lista **friction points** por etapa con impacto estimado, causa raíz y quick wins vs proyectos.";
    const fewShot =
      '{"result":"Top 8 fricciones: 3 checkout, 2 onboarding","score":87,"recommendations":["Medir con datos","Priorizar por volumen","A/B aliviar una a la vez"]}';
    return runCustomerJourneyAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCustomerJourneyFriccionAgent(): CustomerJourneyFriccionAgent {
  return CustomerJourneyFriccionAgent.instance();
}

export function resetCustomerJourneyFriccionAgentForTests(): void {
  inst = null;
}
