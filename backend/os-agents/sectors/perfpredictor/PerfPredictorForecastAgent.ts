import type { ILlmClient } from "../../LlmClient";
import type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
import { getDefaultPerfPredictorLlm, runPerfPredictorAgentCore } from "./shared";

const AGENT_ID = "perfpredictor-forecast";

export class PerfPredictorForecastAgent {
  private static inst: PerfPredictorForecastAgent | undefined;

  static get instance(): PerfPredictorForecastAgent {
    if (!PerfPredictorForecastAgent.inst) PerfPredictorForecastAgent.inst = new PerfPredictorForecastAgent();
    return PerfPredictorForecastAgent.inst;
  }

  static reset(): void {
    PerfPredictorForecastAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPerfPredictorLlm();
  }

  async run(input: PerfPredictorInput): Promise<PerfPredictorOutput> {
    const eliteRole =
      "Eres **PerfPredictor Forecast Lead** — proyecciones CTR, conversiones y ROAS con intervalos.";
    const mission =
      "Predice resultados futuros: **CTR**, **conversiones**, **ROAS** en **30/60/90 días** con escenarios optimista/base/pesimista y confianza por horizonte.";
    const fewShot =
      '{"content":"30d ROAS base 3.2x conf 88% optimistic/pessimistic bands","score":92,"highlights":["30d high conf","ROAS bands"],"metrics":["Predicted CTR"]}';
    return runPerfPredictorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getPerfPredictorForecastAgent(): PerfPredictorForecastAgent {
  return PerfPredictorForecastAgent.instance;
}

export function resetPerfPredictorForecastAgentForTests(): void {
  PerfPredictorForecastAgent.reset();
}
