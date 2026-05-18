import type { ILlmClient } from "../../LlmClient";
import type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
import { getDefaultPerfPredictorLlm, runPerfPredictorAgentCore } from "./shared";

const AGENT_ID = "perfpredictor-trend";

export class PerfPredictorTrendAgent {
  private static inst: PerfPredictorTrendAgent | undefined;

  static get instance(): PerfPredictorTrendAgent {
    if (!PerfPredictorTrendAgent.inst) PerfPredictorTrendAgent.inst = new PerfPredictorTrendAgent();
    return PerfPredictorTrendAgent.inst;
  }

  static reset(): void {
    PerfPredictorTrendAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPerfPredictorLlm();
  }

  async run(input: PerfPredictorInput): Promise<PerfPredictorOutput> {
    const eliteRole =
      "Eres **PerfPredictor Sector Trend Analyst** — señales macro del vertical.";
    const mission =
      "Detecta **tendencias del sector** para anticipar cambios en demanda, CPC y conversión; impacto en forecast 60/90 días.";
    const fewShot =
      '{"content":"Sector CPC uptrend + demand seasonality shift","score":89,"highlights":["Trend signal","60d impact"],"metrics":["Trend strength"]}';
    return runPerfPredictorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPerfPredictorTrendAgent(): PerfPredictorTrendAgent {
  return PerfPredictorTrendAgent.instance;
}

export function resetPerfPredictorTrendAgentForTests(): void {
  PerfPredictorTrendAgent.reset();
}
