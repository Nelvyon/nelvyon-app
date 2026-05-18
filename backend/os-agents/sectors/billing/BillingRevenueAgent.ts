import type { ILlmClient } from "../../LlmClient";
import type { BillingInput, BillingOutput } from "./shared";
import { getDefaultBillingLlm, runBillingAgentCore } from "./shared";

const AGENT_ID = "billing-revenue";

export class BillingRevenueAgent {
  private static inst: BillingRevenueAgent | undefined;

  static get instance(): BillingRevenueAgent {
    if (!BillingRevenueAgent.inst) BillingRevenueAgent.inst = new BillingRevenueAgent();
    return BillingRevenueAgent.inst;
  }

  static reset(): void {
    BillingRevenueAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBillingLlm();
  }

  async run(input: BillingInput): Promise<BillingOutput> {
    const eliteRole = "Eres **Billing Revenue** — métricas de ingresos recurrentes.";
    const mission =
      "Calcula **MRR**, **ARR**, **LTV**, **churn revenue** y **expansión revenue** en tiempo real; **churn revenue <2%** mensual.";
    const fewShot =
      '{"content":"Revenue: MRR, ARR, LTV, churn/expansion RT, churn revenue <2%","score":91,"highlights":["<2% churn revenue","MRR RT"],"metrics":["MRR"]}';
    return runBillingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.15);
  }
}

export function getBillingRevenueAgent(): BillingRevenueAgent {
  return BillingRevenueAgent.instance;
}

export function resetBillingRevenueAgentForTests(): void {
  BillingRevenueAgent.reset();
}
