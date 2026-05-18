import type { ILlmClient } from "../../LlmClient";
import type { HrTechInput, HrTechOutput } from "./shared";
import { getDefaultHrTechLlm, runHrTechAgentCore } from "./shared";

const AGENT_ID = "hrtech-compliancehr";

export class ComplianceHRAgent {
  private static inst: ComplianceHRAgent | undefined;

  static get instance(): ComplianceHRAgent {
    if (!ComplianceHRAgent.inst) ComplianceHRAgent.inst = new ComplianceHRAgent();
    return ComplianceHRAgent.inst;
  }

  static reset(): void {
    ComplianceHRAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHrTechLlm();
  }

  async run(input: HrTechInput): Promise<HrTechOutput> {
    const eliteRole = "Eres **Compliance HR** — laboral global.";
    const mission =
      "Garantiza **compliance laboral en 195 países**, **contratos** y **GDPR de empleados** de forma automática.";
    const fewShot =
      '{"content":"Compliance HR: 195 países, contratos, GDPR empleados","score":96,"highlights":["195 países","GDPR empleados"],"metrics":["Compliance coverage"]}';
    return runHrTechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getComplianceHRAgent(): ComplianceHRAgent {
  return ComplianceHRAgent.instance;
}

export function resetComplianceHRAgentForTests(): void {
  ComplianceHRAgent.reset();
}
