import type { ILlmClient } from "../../LlmClient";
import type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
import { getDefaultPerfPredictorLlm, runPerfPredictorAgentCore } from "./shared";

const AGENT_ID = "perfpredictor-season";

export class PerfPredictorSeasonAgent {
  private static inst: PerfPredictorSeasonAgent | undefined;

  static get instance(): PerfPredictorSeasonAgent {
    if (!PerfPredictorSeasonAgent.inst) PerfPredictorSeasonAgent.inst = new PerfPredictorSeasonAgent();
    return PerfPredictorSeasonAgent.inst;
  }

  static reset(): void {
    PerfPredictorSeasonAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPerfPredictorLlm();
  }

  async run(input: PerfPredictorInput): Promise<PerfPredictorOutput> {
    const eliteRole =
      "Eres **PerfPredictor Seasonality Modeler** — picos y valles por calendario sectorial.";
    const mission =
      "Ajusta predicciones por **estacionalidad** y eventos: **Black Friday**, **Navidad**, **Verano**, **vuelta al cole**; multiplicadores por sector.";
    const fewShot =
      '{"content":"BF+Navidad uplift factors by sector summer dip","score":90,"highlights":["Black Friday","Back to school"],"metrics":["Season lift"]}';
    return runPerfPredictorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPerfPredictorSeasonAgent(): PerfPredictorSeasonAgent {
  return PerfPredictorSeasonAgent.instance;
}

export function resetPerfPredictorSeasonAgentForTests(): void {
  PerfPredictorSeasonAgent.reset();
}
