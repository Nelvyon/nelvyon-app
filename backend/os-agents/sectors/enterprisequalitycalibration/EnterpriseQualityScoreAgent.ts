import type { ILlmClient } from "../../LlmClient";
import type { EnterpriseQualityCalibrationInput, EnterpriseQualityCalibrationOutput } from "./shared";
import { getDefaultEnterpriseQualityCalibrationLlm, runEnterpriseQualityCalibrationAgentCore } from "./shared";

const AGENT_ID = "enterprisequalitycalibration-score";

export class EnterpriseQualityScoreAgent {
  private static inst: EnterpriseQualityScoreAgent | undefined;

  static get instance(): EnterpriseQualityScoreAgent {
    if (!EnterpriseQualityScoreAgent.inst) EnterpriseQualityScoreAgent.inst = new EnterpriseQualityScoreAgent();
    return EnterpriseQualityScoreAgent.inst;
  }

  static reset(): void {
    EnterpriseQualityScoreAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnterpriseQualityCalibrationLlm();
  }

  async run(input: EnterpriseQualityCalibrationInput): Promise<EnterpriseQualityCalibrationOutput> {
    const eliteRole = "Eres **EnterpriseQuality Score** — score global de calidad.";
    const mission =
      "Calcula **score 0-100** por output de cualquier agente NELVYON; umbral mínimo **85/100**.";
    const fewShot =
      '{"content":"Global quality score 0-100 any NELVYON agent output min 85","score":91,"highlights":["Min 85 threshold","0-100 score"],"metrics":["Quality score"]}';
    return runEnterpriseQualityCalibrationAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getEnterpriseQualityScoreAgent(): EnterpriseQualityScoreAgent {
  return EnterpriseQualityScoreAgent.instance;
}

export function resetEnterpriseQualityScoreAgentForTests(): void {
  EnterpriseQualityScoreAgent.reset();
}
