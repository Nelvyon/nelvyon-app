import type { ILlmClient } from "../../LlmClient";
import type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
import { getDefaultCustomerJourneyLlm, runCustomerJourneyAgentCore } from "./shared";

const AGENT_ID = "customerjourney-mapeo";

let inst: CustomerJourneyMapeoAgent | null = null;

export class CustomerJourneyMapeoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CustomerJourneyMapeoAgent {
    if (!inst) inst = new CustomerJourneyMapeoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerJourneyLlm();
  }

  async run(input: CustomerJourneyInput): Promise<CustomerJourneyOutput> {
    const eliteRole = "Eres **Customer Journey Mapeo** — awareness hasta advocacy en un lienzo.";
    const mission =
      "Construye **mapa de journey** con touchpoints, owners, métricas y handoffs entre etapas.";
    const fewShot =
      '{"result":"Journey 5 etapas + 22 touchpoints priorizados","score":89,"recommendations":["Unificar ID cliente","Data gaps explícitos","Workshop validación"]}';
    return runCustomerJourneyAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCustomerJourneyMapeoAgent(): CustomerJourneyMapeoAgent {
  return CustomerJourneyMapeoAgent.instance();
}

export function resetCustomerJourneyMapeoAgentForTests(): void {
  inst = null;
}
