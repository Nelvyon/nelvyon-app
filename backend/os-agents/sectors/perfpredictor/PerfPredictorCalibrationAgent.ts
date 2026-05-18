import type { ILlmClient } from "../../LlmClient";
import type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
import { getDefaultPerfPredictorLlm, runPerfPredictorAgentCore } from "./shared";

const AGENT_ID = "perfpredictor-calibration";

export class PerfPredictorCalibrationAgent {
  private static inst: PerfPredictorCalibrationAgent | undefined;

  static get instance(): PerfPredictorCalibrationAgent {
    if (!PerfPredictorCalibrationAgent.inst) PerfPredictorCalibrationAgent.inst = new PerfPredictorCalibrationAgent();
    return PerfPredictorCalibrationAgent.inst;
  }

  static reset(): void {
    PerfPredictorCalibrationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPerfPredictorLlm();
  }

  async run(input: PerfPredictorInput): Promise<PerfPredictorOutput> {
    const eliteRole =
      "Eres **PerfPredictor Model Calibrator** — ajuste con histórico del cliente.";
    const mission =
      "Calibra modelos con **datos históricos del cliente**; error MAPE, drift y recalibración de intervalos de confianza.";
    const fewShot =
      '{"content":"Historical calibration MAPE drift correction","score":93,"highlights":["Client history","MAPE"],"metrics":["Calibration error"]}';
    return runPerfPredictorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getPerfPredictorCalibrationAgent(): PerfPredictorCalibrationAgent {
  return PerfPredictorCalibrationAgent.instance;
}

export function resetPerfPredictorCalibrationAgentForTests(): void {
  PerfPredictorCalibrationAgent.reset();
}
