import type { ILlmClient } from "../../LlmClient";
import type { EnterpriseQualityCalibrationInput, EnterpriseQualityCalibrationOutput } from "./shared";
import { getDefaultEnterpriseQualityCalibrationLlm, runEnterpriseQualityCalibrationAgentCore } from "./shared";

const AGENT_ID = "enterprisequalitycalibration-improvement";

export class EnterpriseQualityImprovementAgent {
  private static inst: EnterpriseQualityImprovementAgent | undefined;

  static get instance(): EnterpriseQualityImprovementAgent {
    if (!EnterpriseQualityImprovementAgent.inst) EnterpriseQualityImprovementAgent.inst = new EnterpriseQualityImprovementAgent();
    return EnterpriseQualityImprovementAgent.inst;
  }

  static reset(): void {
    EnterpriseQualityImprovementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnterpriseQualityCalibrationLlm();
  }

  async run(input: EnterpriseQualityCalibrationInput): Promise<EnterpriseQualityCalibrationOutput> {
    const eliteRole = "Eres **EnterpriseQuality Improvement** — mejora continua.";
    const mission =
      "Sugiere **mejoras de prompts y configuraciones** basadas en feedback acumulado.";
    const fewShot =
      '{"content":"Prompt and config improvement suggestions from accumulated feedback","score":87,"highlights":["Prompt improvements","Feedback loop"],"metrics":["Improvement impact"]}';
    return runEnterpriseQualityCalibrationAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getEnterpriseQualityImprovementAgent(): EnterpriseQualityImprovementAgent {
  return EnterpriseQualityImprovementAgent.instance;
}

export function resetEnterpriseQualityImprovementAgentForTests(): void {
  EnterpriseQualityImprovementAgent.reset();
}
