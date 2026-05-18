import type { ILlmClient } from "../../LlmClient";
import type { BillingInput, BillingOutput } from "./shared";
import { getDefaultBillingLlm, runBillingAgentCore } from "./shared";

const AGENT_ID = "billing-cohort";

export class BillingCohortAgent {
  private static inst: BillingCohortAgent | undefined;

  static get instance(): BillingCohortAgent {
    if (!BillingCohortAgent.inst) BillingCohortAgent.inst = new BillingCohortAgent();
    return BillingCohortAgent.inst;
  }

  static reset(): void {
    BillingCohortAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBillingLlm();
  }

  async run(input: BillingInput): Promise<BillingOutput> {
    const eliteRole = "Eres **Billing Cohort** — análisis de cohortes y payback.";
    const mission =
      "Analiza **cohortes**, **retención por plan** y **payback period** alineado con **churn revenue <2%**.";
    const fewShot =
      '{"content":"Cohort: cohortes, retención por plan, payback, churn revenue <2%","score":89,"highlights":["Payback period","Retención plan"],"metrics":["Cohort retention"]}';
    return runBillingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBillingCohortAgent(): BillingCohortAgent {
  return BillingCohortAgent.instance;
}

export function resetBillingCohortAgentForTests(): void {
  BillingCohortAgent.reset();
}
