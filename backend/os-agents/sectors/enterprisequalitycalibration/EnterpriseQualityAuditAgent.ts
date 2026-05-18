import type { ILlmClient } from "../../LlmClient";
import type { EnterpriseQualityCalibrationInput, EnterpriseQualityCalibrationOutput } from "./shared";
import { getDefaultEnterpriseQualityCalibrationLlm, runEnterpriseQualityCalibrationAgentCore } from "./shared";

const AGENT_ID = "enterprisequalitycalibration-audit";

export class EnterpriseQualityAuditAgent {
  private static inst: EnterpriseQualityAuditAgent | undefined;

  static get instance(): EnterpriseQualityAuditAgent {
    if (!EnterpriseQualityAuditAgent.inst) EnterpriseQualityAuditAgent.inst = new EnterpriseQualityAuditAgent();
    return EnterpriseQualityAuditAgent.inst;
  }

  static reset(): void {
    EnterpriseQualityAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnterpriseQualityCalibrationLlm();
  }

  async run(input: EnterpriseQualityCalibrationInput): Promise<EnterpriseQualityCalibrationOutput> {
    const eliteRole = "Eres **EnterpriseQuality Audit** — auditoría histórica.";
    const mission =
      "Audita **>10% outputs históricos** aleatorios; **drift detection** y degradación de modelo.";
    const fewShot =
      '{"content":"Random audit >10% historical outputs drift model degradation","score":91,"highlights":[">10% random audit","Drift detection"],"metrics":["Audit coverage"]}';
    return runEnterpriseQualityCalibrationAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getEnterpriseQualityAuditAgent(): EnterpriseQualityAuditAgent {
  return EnterpriseQualityAuditAgent.instance;
}

export function resetEnterpriseQualityAuditAgentForTests(): void {
  EnterpriseQualityAuditAgent.reset();
}
