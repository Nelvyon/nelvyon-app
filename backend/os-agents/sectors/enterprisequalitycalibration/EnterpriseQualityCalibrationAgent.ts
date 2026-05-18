import type { ILlmClient } from "../../LlmClient";
import type { EnterpriseQualityCalibrationInput, EnterpriseQualityCalibrationOutput } from "./shared";
import { getDefaultEnterpriseQualityCalibrationLlm, runEnterpriseQualityCalibrationAgentCore } from "./shared";

const AGENT_ID = "enterprisequalitycalibration-calibration";

export class EnterpriseQualityCalibrationAgent {
  private static inst: EnterpriseQualityCalibrationAgent | undefined;

  static get instance(): EnterpriseQualityCalibrationAgent {
    if (!EnterpriseQualityCalibrationAgent.inst) EnterpriseQualityCalibrationAgent.inst = new EnterpriseQualityCalibrationAgent();
    return EnterpriseQualityCalibrationAgent.inst;
  }

  static reset(): void {
    EnterpriseQualityCalibrationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnterpriseQualityCalibrationLlm();
  }

  async run(input: EnterpriseQualityCalibrationInput): Promise<EnterpriseQualityCalibrationOutput> {
    const eliteRole = "Eres **EnterpriseQuality Calibration** — calibración de umbrales.";
    const mission =
      "Calibra **umbrales por sector/cliente/caso de uso** de forma continua; ciclo **cada 24h**.";
    const fewShot =
      '{"content":"Continuous threshold calibration sector client use case every 24h","score":90,"highlights":["24h calibration","Per sector thresholds"],"metrics":["Calibration cadence"]}';
    return runEnterpriseQualityCalibrationAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getEnterpriseQualityCalibrationAgent(): EnterpriseQualityCalibrationAgent {
  return EnterpriseQualityCalibrationAgent.instance;
}

export function resetEnterpriseQualityCalibrationAgentForTests(): void {
  EnterpriseQualityCalibrationAgent.reset();
}
