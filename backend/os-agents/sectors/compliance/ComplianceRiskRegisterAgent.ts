import type { ILlmClient } from "../../LlmClient";
import type { ComplianceInput, ComplianceOutput } from "./shared";
import { getDefaultComplianceLlm, runComplianceAgentCore } from "./shared";

const AGENT_ID = "compliance-risk-register";

export class ComplianceRiskRegisterAgent {
  private static inst: ComplianceRiskRegisterAgent | undefined;

  static get instance(): ComplianceRiskRegisterAgent {
    if (!ComplianceRiskRegisterAgent.inst) ComplianceRiskRegisterAgent.inst = new ComplianceRiskRegisterAgent();
    return ComplianceRiskRegisterAgent.inst;
  }

  static reset(): void {
    ComplianceRiskRegisterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComplianceLlm();
  }

  async run(input: ComplianceInput): Promise<ComplianceOutput> {
    return runComplianceAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: ISMS risk assessor top 1%; registro de riesgos accionable para comité.",
      mission:
        "Construye registro de riesgos con probabilidad e impacto (cualitativo), controles existentes y tratamiento propuesto.",
      fewShotExample:
        '{"content":"COMPLY: riesgos arraigados a datos del brief; escala L/M/H; owner sugerido por área.","score":89,"controls":["Riesgo ransomware mitigado por backups inmutables","Exfiltración API reducida por rate limits"],"gaps":["Sin BIA formal para activo crítico X","Proveedor cloud sin DPA archivado"]}',
    }, input);
  }
}

export function getComplianceRiskRegisterAgent(): ComplianceRiskRegisterAgent {
  return ComplianceRiskRegisterAgent.instance;
}

export function resetComplianceRiskRegisterAgentForTests(): void {
  ComplianceRiskRegisterAgent.reset();
}
