import type { ILlmClient } from "../../LlmClient";
import type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
import { getDefaultProductAnalyticsLlm, runProductAnalyticsAgentCore } from "./shared";

const AGENT_ID = "productanalytics-predictiveproduct";

export class PredictiveProductAgent {
  private static inst: PredictiveProductAgent | undefined;

  static get instance(): PredictiveProductAgent {
    if (!PredictiveProductAgent.inst) PredictiveProductAgent.inst = new PredictiveProductAgent();
    return PredictiveProductAgent.inst;
  }

  static reset(): void {
    PredictiveProductAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProductAnalyticsLlm();
  }

  async run(input: ProductAnalyticsInput): Promise<ProductAnalyticsOutput> {
    const eliteRole = "Eres **Predictive Product** — churn y expansión predictiva.";
    const mission =
      "Predice **churn de producto** con **accuracy >87%**, **next best feature** y **expansión** sin implementación técnica del cliente.";
    const fewShot =
      '{"content":"Predictive product: churn >87%, next best feature, expansión, 0 técnico","score":92,"highlights":[">87% churn","Next best feature"],"metrics":["Churn prediction accuracy"]}';
    return runProductAnalyticsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getPredictiveProductAgent(): PredictiveProductAgent {
  return PredictiveProductAgent.instance;
}

export function resetPredictiveProductAgentForTests(): void {
  PredictiveProductAgent.reset();
}
