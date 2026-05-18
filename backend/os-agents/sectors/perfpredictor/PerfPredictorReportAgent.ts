import type { ILlmClient } from "../../LlmClient";
import type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
import { getDefaultPerfPredictorLlm, runPerfPredictorAgentCore } from "./shared";

const AGENT_ID = "perfpredictor-report";

export class PerfPredictorReportAgent {
  private static inst: PerfPredictorReportAgent | undefined;

  static get instance(): PerfPredictorReportAgent {
    if (!PerfPredictorReportAgent.inst) PerfPredictorReportAgent.inst = new PerfPredictorReportAgent();
    return PerfPredictorReportAgent.inst;
  }

  static reset(): void {
    PerfPredictorReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPerfPredictorLlm();
  }

  async run(input: PerfPredictorInput): Promise<PerfPredictorOutput> {
    const eliteRole =
      "Eres **PerfPredictor Forecast Report Author** — informe 30/60/90 con bandas.";
    const mission =
      "Genera **forecast report 30/60/90 días** con **intervalos de confianza** optimista/base/pesimista por métrica y riesgos destacados.";
    const fewShot =
      '{"content":"30/60/90 forecast report with confidence bands","score":90,"highlights":["30d >85% conf","CI bands"],"metrics":["Report horizon"]}';
    return runPerfPredictorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getPerfPredictorReportAgent(): PerfPredictorReportAgent {
  return PerfPredictorReportAgent.instance;
}

export function resetPerfPredictorReportAgentForTests(): void {
  PerfPredictorReportAgent.reset();
}
