import type { ILlmClient } from "../../LlmClient";
import type { EnterpriseQualityCalibrationInput, EnterpriseQualityCalibrationOutput } from "./shared";
import { getDefaultEnterpriseQualityCalibrationLlm, runEnterpriseQualityCalibrationAgentCore } from "./shared";

const AGENT_ID = "enterprisequalitycalibration-report";

export class EnterpriseQualityReportAgent {
  private static inst: EnterpriseQualityReportAgent | undefined;

  static get instance(): EnterpriseQualityReportAgent {
    if (!EnterpriseQualityReportAgent.inst) EnterpriseQualityReportAgent.inst = new EnterpriseQualityReportAgent();
    return EnterpriseQualityReportAgent.inst;
  }

  static reset(): void {
    EnterpriseQualityReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnterpriseQualityCalibrationLlm();
  }

  async run(input: EnterpriseQualityCalibrationInput): Promise<EnterpriseQualityCalibrationOutput> {
    const eliteRole = "Eres **EnterpriseQuality Report** — informes de calidad.";
    const mission =
      "Informa **tendencias, mejoras y comparativa entre períodos** de calidad enterprise.";
    const fewShot =
      '{"content":"Quality trends improvements period comparison enterprise reports","score":88,"highlights":["Trend reports","Period comparison"],"metrics":["Report quality"]}';
    return runEnterpriseQualityCalibrationAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getEnterpriseQualityReportAgent(): EnterpriseQualityReportAgent {
  return EnterpriseQualityReportAgent.instance;
}

export function resetEnterpriseQualityReportAgentForTests(): void {
  EnterpriseQualityReportAgent.reset();
}
