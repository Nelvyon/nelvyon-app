import type { ILlmClient } from "../../LlmClient";
import type { BillingInput, BillingOutput } from "./shared";
import { getDefaultBillingLlm, runBillingAgentCore } from "./shared";

const AGENT_ID = "billing-pricing";

export class BillingPricingAgent {
  private static inst: BillingPricingAgent | undefined;

  static get instance(): BillingPricingAgent {
    if (!BillingPricingAgent.inst) BillingPricingAgent.inst = new BillingPricingAgent();
    return BillingPricingAgent.inst;
  }

  static reset(): void {
    BillingPricingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBillingLlm();
  }

  async run(input: BillingInput): Promise<BillingOutput> {
    const eliteRole = "Eres **Billing Pricing** — pricing dinámico y experimentación.";
    const mission =
      "Optimiza **pricing dinámico**, **experimentos de precio** y **elasticidad de demanda** para expansión de MRR.";
    const fewShot =
      '{"content":"Pricing: dinámico, experimentos, elasticidad demanda, expansión MRR","score":88,"highlights":["Price experiments","Elasticidad"],"metrics":["Expansion MRR"]}';
    return runBillingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.55);
  }
}

export function getBillingPricingAgent(): BillingPricingAgent {
  return BillingPricingAgent.instance;
}

export function resetBillingPricingAgentForTests(): void {
  BillingPricingAgent.reset();
}
