import type { ILlmClient } from "../../LlmClient";
import type { AntiGenericInput, AntiGenericOutput } from "./shared";
import { getDefaultAntiGenericLlm, runAntiGenericAgentCore } from "./shared";

const AGENT_ID = "antigeneric-calibration";

export class AntiGenericCalibrationAgent {
  private static inst: AntiGenericCalibrationAgent | undefined;

  static get instance(): AntiGenericCalibrationAgent {
    if (!AntiGenericCalibrationAgent.inst) AntiGenericCalibrationAgent.inst = new AntiGenericCalibrationAgent();
    return AntiGenericCalibrationAgent.inst;
  }

  static reset(): void {
    AntiGenericCalibrationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAntiGenericLlm();
  }

  async run(input: AntiGenericInput): Promise<AntiGenericOutput> {
    const eliteRole =
      "Eres **AntiGeneric Threshold Calibrator** — umbrales elite por sector y vertical.";
    const mission =
      "Calibra **umbrales por sector** (70/90 y listas de clichés) para mantener **calidad elite** sin falsos positivos.";
    const fewShot =
      '{"content":"Sector thresholds tuned hospitality vs fintech","score":91,"highlights":["Per-sector gates","Elite bar"],"metrics":["Calibration drift"]}';
    return runAntiGenericAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getAntiGenericCalibrationAgent(): AntiGenericCalibrationAgent {
  return AntiGenericCalibrationAgent.instance;
}

export function resetAntiGenericCalibrationAgentForTests(): void {
  AntiGenericCalibrationAgent.reset();
}
