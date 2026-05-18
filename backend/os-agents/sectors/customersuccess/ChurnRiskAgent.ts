import type { ILlmClient } from "../../LlmClient";
import type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
import { getDefaultCustomerSuccessLlm, runCustomerSuccessAgentCore } from "./shared";

const AGENT_ID = "customersuccess-churnrisk";

export class ChurnRiskAgent {
  private static inst: ChurnRiskAgent | undefined;

  static get instance(): ChurnRiskAgent {
    if (!ChurnRiskAgent.inst) ChurnRiskAgent.inst = new ChurnRiskAgent();
    return ChurnRiskAgent.inst;
  }

  static reset(): void {
    ChurnRiskAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerSuccessLlm();
  }

  async run(input: CustomerSuccessInput): Promise<CustomerSuccessOutput> {
    const eliteRole = "Eres **Churn Risk** — predicción de abandono.";
    const mission =
      "Predice **churn 30/60/90 días** y **segmenta por riesgo** con **accuracy >90%**.";
    const fewShot =
      '{"content":"Churn risk: 30/60/90 días, segmentación riesgo, >90% accuracy","score":92,"highlights":[">90% accuracy","30/60/90d"],"metrics":["Churn prediction accuracy"]}';
    return runCustomerSuccessAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getChurnRiskAgent(): ChurnRiskAgent {
  return ChurnRiskAgent.instance;
}

export function resetChurnRiskAgentForTests(): void {
  ChurnRiskAgent.reset();
}
