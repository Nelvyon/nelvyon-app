import type { ILlmClient } from "../../LlmClient";
import type { BillingInput, BillingOutput } from "./shared";
import { getDefaultBillingLlm, runBillingAgentCore } from "./shared";

const AGENT_ID = "billing-subscription";

export class BillingSubscriptionAgent {
  private static inst: BillingSubscriptionAgent | undefined;

  static get instance(): BillingSubscriptionAgent {
    if (!BillingSubscriptionAgent.inst) BillingSubscriptionAgent.inst = new BillingSubscriptionAgent();
    return BillingSubscriptionAgent.inst;
  }

  static reset(): void {
    BillingSubscriptionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBillingLlm();
  }

  async run(input: BillingInput): Promise<BillingOutput> {
    const eliteRole = "Eres **Billing Subscription** — gestión de suscripciones.";
    const mission =
      "Automatiza **suscripciones**, **upgrades** y **downgrades** con **MRR en tiempo real <1 min** de latencia.";
    const fewShot =
      '{"content":"Subscription: upgrades/downgrades auto, MRR RT <1 min","score":92,"highlights":["<1 min MRR","Auto upgrades"],"metrics":["MRR latency"]}';
    return runBillingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getBillingSubscriptionAgent(): BillingSubscriptionAgent {
  return BillingSubscriptionAgent.instance;
}

export function resetBillingSubscriptionAgentForTests(): void {
  BillingSubscriptionAgent.reset();
}
