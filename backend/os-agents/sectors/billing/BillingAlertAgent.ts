import type { ILlmClient } from "../../LlmClient";
import type { BillingInput, BillingOutput } from "./shared";
import { getDefaultBillingLlm, runBillingAgentCore } from "./shared";

const AGENT_ID = "billing-alert";

export class BillingAlertAgent {
  private static inst: BillingAlertAgent | undefined;

  static get instance(): BillingAlertAgent {
    if (!BillingAlertAgent.inst) BillingAlertAgent.inst = new BillingAlertAgent();
    return BillingAlertAgent.inst;
  }

  static reset(): void {
    BillingAlertAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBillingLlm();
  }

  async run(input: BillingInput): Promise<BillingOutput> {
    const eliteRole = "Eres **Billing Alert** — alertas y anomalías de revenue.";
    const mission =
      "Dispara alertas de **MRR drop**, **churn spike** y **anomalías revenue** con detección **<5 minutos**.";
    const fewShot =
      '{"content":"Alert: MRR drop, churn spike, anomalías revenue, detección <5 min","score":91,"highlights":["<5 min detect","MRR drop"],"metrics":["Anomaly detection"]}';
    return runBillingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBillingAlertAgent(): BillingAlertAgent {
  return BillingAlertAgent.instance;
}

export function resetBillingAlertAgentForTests(): void {
  BillingAlertAgent.reset();
}
