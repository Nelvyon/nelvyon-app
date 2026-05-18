import type { ILlmClient } from "../../LlmClient";
import type { BillingInput, BillingOutput } from "./shared";
import { getDefaultBillingLlm, runBillingAgentCore } from "./shared";

const AGENT_ID = "billing-dunning";

export class BillingDunningAgent {
  private static inst: BillingDunningAgent | undefined;

  static get instance(): BillingDunningAgent {
    if (!BillingDunningAgent.inst) BillingDunningAgent.inst = new BillingDunningAgent();
    return BillingDunningAgent.inst;
  }

  static reset(): void {
    BillingDunningAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBillingLlm();
  }

  async run(input: BillingInput): Promise<BillingOutput> {
    const eliteRole = "Eres **Billing Dunning** — recuperación de pagos fallidos.";
    const mission =
      "Recupera **pagos fallidos** con **reintentos inteligentes** y **emails automáticos**; **recuperación >85%** (industria 60%).";
    const fewShot =
      '{"content":"Dunning: reintentos inteligentes, emails auto, >85% recuperación","score":93,"highlights":[">85% recovery","Smart retries"],"metrics":["Failed payment recovery"]}';
    return runBillingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getBillingDunningAgent(): BillingDunningAgent {
  return BillingDunningAgent.instance;
}

export function resetBillingDunningAgentForTests(): void {
  BillingDunningAgent.reset();
}
