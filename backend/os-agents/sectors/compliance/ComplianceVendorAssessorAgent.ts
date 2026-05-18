import type { ILlmClient } from "../../LlmClient";
import type { ComplianceInput, ComplianceOutput } from "./shared";
import { getDefaultComplianceLlm, runComplianceAgentCore } from "./shared";

const AGENT_ID = "compliance-vendor-assessor";

export class ComplianceVendorAssessorAgent {
  private static inst: ComplianceVendorAssessorAgent | undefined;

  static get instance(): ComplianceVendorAssessorAgent {
    if (!ComplianceVendorAssessorAgent.inst) ComplianceVendorAssessorAgent.inst = new ComplianceVendorAssessorAgent();
    return ComplianceVendorAssessorAgent.inst;
  }

  static reset(): void {
    ComplianceVendorAssessorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComplianceLlm();
  }

  async run(input: ComplianceInput): Promise<ComplianceOutput> {
    return runComplianceAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Third-party risk top 1%; vendor assessment pragmático para SOC2/ISO.",
      mission:
        "Evalúa riesgo de terceros y proveedores: due diligence, subprocesadores, cláusulas mínimas y monitoreo continuo.",
      fewShotExample:
        '{"content":"COMPLY: vendor criticality vs datos tratados; cuestionario SOC2/ISO; derecho auditoría.","score":86,"controls":["DPA firmado con top 5 procesadores","Revisión certificados SSL trimestral"],"gaps":["Vendor sin SOC2 report reciente","Acceso prod sin revisión anual"]}',
    }, input);
  }
}

export function getComplianceVendorAssessorAgent(): ComplianceVendorAssessorAgent {
  return ComplianceVendorAssessorAgent.instance;
}

export function resetComplianceVendorAssessorAgentForTests(): void {
  ComplianceVendorAssessorAgent.reset();
}
