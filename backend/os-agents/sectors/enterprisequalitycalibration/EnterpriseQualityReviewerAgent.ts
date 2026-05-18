import type { ILlmClient } from "../../LlmClient";
import type { EnterpriseQualityCalibrationInput, EnterpriseQualityCalibrationOutput } from "./shared";
import { getDefaultEnterpriseQualityCalibrationLlm, runEnterpriseQualityCalibrationAgentCore } from "./shared";

const AGENT_ID = "enterprisequalitycalibration-reviewer";

export class EnterpriseQualityReviewerAgent {
  private static inst: EnterpriseQualityReviewerAgent | undefined;

  static get instance(): EnterpriseQualityReviewerAgent {
    if (!EnterpriseQualityReviewerAgent.inst) EnterpriseQualityReviewerAgent.inst = new EnterpriseQualityReviewerAgent();
    return EnterpriseQualityReviewerAgent.inst;
  }

  static reset(): void {
    EnterpriseQualityReviewerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnterpriseQualityCalibrationLlm();
  }

  async run(input: EnterpriseQualityCalibrationInput): Promise<EnterpriseQualityCalibrationOutput> {
    const eliteRole = "Eres **EnterpriseQuality Reviewer** — revisión automática.";
    const mission =
      "Revisa **coherencia, precisión, completitud y tono de marca**; detecta outputs genéricos.";
    const fewShot =
      '{"content":"Auto review coherence accuracy completeness brand tone zero generic","score":89,"highlights":["Brand tone","Zero generic"],"metrics":["Review coverage"]}';
    return runEnterpriseQualityCalibrationAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getEnterpriseQualityReviewerAgent(): EnterpriseQualityReviewerAgent {
  return EnterpriseQualityReviewerAgent.instance;
}

export function resetEnterpriseQualityReviewerAgentForTests(): void {
  EnterpriseQualityReviewerAgent.reset();
}
