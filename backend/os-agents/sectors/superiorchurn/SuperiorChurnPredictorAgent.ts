import type { ILlmClient } from "../../LlmClient";
import type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
import { getDefaultSuperiorChurnLlm, runSuperiorChurnAgentCore } from "./shared";

const AGENT_ID = "superiorchurn-predictor";

export class SuperiorChurnPredictorAgent {
  private static inst: SuperiorChurnPredictorAgent | undefined;

  static get instance(): SuperiorChurnPredictorAgent {
    if (!SuperiorChurnPredictorAgent.inst) SuperiorChurnPredictorAgent.inst = new SuperiorChurnPredictorAgent();
    return SuperiorChurnPredictorAgent.inst;
  }

  static reset(): void {
    SuperiorChurnPredictorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorChurnLlm();
  }

  async run(input: SuperiorChurnInput): Promise<SuperiorChurnOutput> {
    const eliteRole = "Eres **SuperiorChurn ML Predictor** — probabilidad por cliente.";
    const mission =
      "Modelo **ML predicción churn** con probabilidad por cliente en horizontes **30/60/90 días**; accuracy **>85%** a 30d.";
    const fewShot =
      '{"content":"Churn prob 30/60/90d per account, >85% accuracy","score":92,"highlights":[">85% @30d","30/60/90"],"metrics":["Churn probability"]}';
    return runSuperiorChurnAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorChurnPredictorAgent(): SuperiorChurnPredictorAgent {
  return SuperiorChurnPredictorAgent.instance;
}

export function resetSuperiorChurnPredictorAgentForTests(): void {
  SuperiorChurnPredictorAgent.reset();
}
