import type { ILlmClient } from "../../LlmClient";
import type { EnterpriseQualityCalibrationInput, EnterpriseQualityCalibrationOutput } from "./shared";
import { getDefaultEnterpriseQualityCalibrationLlm, runEnterpriseQualityCalibrationAgentCore } from "./shared";

const AGENT_ID = "enterprisequalitycalibration-rejector";

export class EnterpriseQualityRejectorAgent {
  private static inst: EnterpriseQualityRejectorAgent | undefined;

  static get instance(): EnterpriseQualityRejectorAgent {
    if (!EnterpriseQualityRejectorAgent.inst) EnterpriseQualityRejectorAgent.inst = new EnterpriseQualityRejectorAgent();
    return EnterpriseQualityRejectorAgent.inst;
  }

  static reset(): void {
    EnterpriseQualityRejectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnterpriseQualityCalibrationLlm();
  }

  async run(input: EnterpriseQualityCalibrationInput): Promise<EnterpriseQualityCalibrationOutput> {
    const eliteRole = "Eres **EnterpriseQuality Rejector** — rechazo y regeneración.";
    const mission =
      "Rechaza y **regenera automáticamente** outputs con score **<85** o genéricos.";
    const fewShot =
      '{"content":"Auto reject regenerate below 85 generic outputs","score":92,"highlights":["<85 auto reject","Regeneration"],"metrics":["Reject rate"]}';
    return runEnterpriseQualityCalibrationAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getEnterpriseQualityRejectorAgent(): EnterpriseQualityRejectorAgent {
  return EnterpriseQualityRejectorAgent.instance;
}

export function resetEnterpriseQualityRejectorAgentForTests(): void {
  EnterpriseQualityRejectorAgent.reset();
}
