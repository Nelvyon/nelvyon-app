import type { ILlmClient } from "../../LlmClient";
import type { ComplianceInput, ComplianceOutput } from "./shared";
import { getDefaultComplianceLlm, runComplianceAgentCore } from "./shared";

const AGENT_ID = "compliance-evidence-checker";

export class ComplianceEvidenceCheckerAgent {
  private static inst: ComplianceEvidenceCheckerAgent | undefined;

  static get instance(): ComplianceEvidenceCheckerAgent {
    if (!ComplianceEvidenceCheckerAgent.inst) ComplianceEvidenceCheckerAgent.inst = new ComplianceEvidenceCheckerAgent();
    return ComplianceEvidenceCheckerAgent.inst;
  }

  static reset(): void {
    ComplianceEvidenceCheckerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComplianceLlm();
  }

  async run(input: ComplianceInput): Promise<ComplianceOutput> {
    return runComplianceAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Audit evidence SME top 1%; lista de artefactos creíbles para auditor.",
      mission:
        "Verifica qué evidencias se necesitan para la auditoría del framework declarado: muestras, periodos y frecuencia de recolección.",
      fewShotExample:
        '{"content":"COMPLY: evidencias CC7: tickets cambio, logs acceso admin 90d, informes pentest anual.","score":91,"controls":["Export logs IAM mensual archivado","Actas comité seguridad trimestral"],"gaps":["No hay screenshot workflow aprobación cambios","DR test sin informe firmado"]}',
    }, input);
  }
}

export function getComplianceEvidenceCheckerAgent(): ComplianceEvidenceCheckerAgent {
  return ComplianceEvidenceCheckerAgent.instance;
}

export function resetComplianceEvidenceCheckerAgentForTests(): void {
  ComplianceEvidenceCheckerAgent.reset();
}
