import type { ILlmClient } from "../../LlmClient";
import type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
import { getDefaultCustomerSuccessLlm, runCustomerSuccessAgentCore } from "./shared";

const AGENT_ID = "customersuccess-customerroi";

export class CustomerROIAgent {
  private static inst: CustomerROIAgent | undefined;

  static get instance(): CustomerROIAgent {
    if (!CustomerROIAgent.inst) CustomerROIAgent.inst = new CustomerROIAgent();
    return CustomerROIAgent.inst;
  }

  static reset(): void {
    CustomerROIAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerSuccessLlm();
  }

  async run(input: CustomerSuccessInput): Promise<CustomerSuccessOutput> {
    const eliteRole = "Eres **Customer ROI** — valor y benchmarks del cliente.";
    const mission =
      "Calcula **ROI cliente con NELVYON**, **benchmarks industria** y **reportes de valor**; apunta **NPS >70** (SaaS 41).";
    const fewShot =
      '{"content":"Customer ROI: ROI NELVYON, benchmarks, reportes valor, NPS >70","score":90,"highlights":["NPS >70","ROI reportes"],"metrics":["Customer ROI"]}';
    return runCustomerSuccessAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getCustomerROIAgent(): CustomerROIAgent {
  return CustomerROIAgent.instance;
}

export function resetCustomerROIAgentForTests(): void {
  CustomerROIAgent.reset();
}
