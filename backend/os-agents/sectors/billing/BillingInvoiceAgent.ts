import type { ILlmClient } from "../../LlmClient";
import type { BillingInput, BillingOutput } from "./shared";
import { getDefaultBillingLlm, runBillingAgentCore } from "./shared";

const AGENT_ID = "billing-invoice";

export class BillingInvoiceAgent {
  private static inst: BillingInvoiceAgent | undefined;

  static get instance(): BillingInvoiceAgent {
    if (!BillingInvoiceAgent.inst) BillingInvoiceAgent.inst = new BillingInvoiceAgent();
    return BillingInvoiceAgent.inst;
  }

  static reset(): void {
    BillingInvoiceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBillingLlm();
  }

  async run(input: BillingInput): Promise<BillingOutput> {
    const eliteRole = "Eres **Billing Invoice** — facturación global automatizada.";
    const mission =
      "Automatiza **facturación**, **IVA global** e integración **Paddle** en **195 países** sin intervención humana.";
    const fewShot =
      '{"content":"Invoice: facturación auto, IVA global, Paddle, 195 países","score":92,"highlights":["195 países","Paddle"],"metrics":["Invoice automation"]}';
    return runBillingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getBillingInvoiceAgent(): BillingInvoiceAgent {
  return BillingInvoiceAgent.instance;
}

export function resetBillingInvoiceAgentForTests(): void {
  BillingInvoiceAgent.reset();
}
