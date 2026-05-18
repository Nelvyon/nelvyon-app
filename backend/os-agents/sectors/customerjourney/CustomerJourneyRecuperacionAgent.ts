import type { ILlmClient } from "../../LlmClient";
import type { CustomerJourneyInput, CustomerJourneyOutput } from "./shared";
import { getDefaultCustomerJourneyLlm, runCustomerJourneyAgentCore } from "./shared";

const AGENT_ID = "customerjourney-recuperacion";

let inst: CustomerJourneyRecuperacionAgent | null = null;

export class CustomerJourneyRecuperacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CustomerJourneyRecuperacionAgent {
    if (!inst) inst = new CustomerJourneyRecuperacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerJourneyLlm();
  }

  async run(input: CustomerJourneyInput): Promise<CustomerJourneyOutput> {
    const eliteRole = "Eres **Customer Journey Recuperación** — rescate por fase sin presión abusiva.";
    const mission =
      "Planifica **recuperación automática** (carrito, trial, churn temprano, dormidos; incentivos y límites).";
    const fewShot =
      '{"result":"Playbook 4 fases con 3 intentos max/caso","score":85,"recommendations":["Honrar bajas","No re-opt sin consent","Control descuentos"]}';
    return runCustomerJourneyAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCustomerJourneyRecuperacionAgent(): CustomerJourneyRecuperacionAgent {
  return CustomerJourneyRecuperacionAgent.instance();
}

export function resetCustomerJourneyRecuperacionAgentForTests(): void {
  inst = null;
}
