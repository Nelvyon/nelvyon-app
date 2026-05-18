import type { ILlmClient } from "../../LlmClient";
import type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
import { getDefaultPerfPredictorLlm, runPerfPredictorAgentCore } from "./shared";

const AGENT_ID = "perfpredictor-risk";

export class PerfPredictorRiskAgent {
  private static inst: PerfPredictorRiskAgent | undefined;

  static get instance(): PerfPredictorRiskAgent {
    if (!PerfPredictorRiskAgent.inst) PerfPredictorRiskAgent.inst = new PerfPredictorRiskAgent();
    return PerfPredictorRiskAgent.inst;
  }

  static reset(): void {
    PerfPredictorRiskAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPerfPredictorLlm();
  }

  async run(input: PerfPredictorInput): Promise<PerfPredictorOutput> {
    const eliteRole =
      "Eres **PerfPredictor Risk Sentinel** — fatiga, CPC y churn en forecast.";
    const mission =
      "Detecta **riesgos**: **saturación audiencia** (**frecuencia Meta >3.5**), **subida CPCs**, **churn**; severidad y mitigación.";
    const fewShot =
      '{"content":"Meta freq 3.8 fatigue alert CPC spike churn risk","score":92,"highlights":["Freq >3.5","CPC rise"],"metrics":["Risk score"]}';
    return runPerfPredictorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getPerfPredictorRiskAgent(): PerfPredictorRiskAgent {
  return PerfPredictorRiskAgent.instance;
}

export function resetPerfPredictorRiskAgentForTests(): void {
  PerfPredictorRiskAgent.reset();
}
