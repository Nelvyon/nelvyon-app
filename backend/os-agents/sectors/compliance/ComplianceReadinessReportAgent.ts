import type { ILlmClient } from "../../LlmClient";
import type { ComplianceInput, ComplianceOutput } from "./shared";
import { getDefaultComplianceLlm, runComplianceAgentCore } from "./shared";

const AGENT_ID = "compliance-readiness-report";

export class ComplianceReadinessReportAgent {
  private static inst: ComplianceReadinessReportAgent | undefined;

  static get instance(): ComplianceReadinessReportAgent {
    if (!ComplianceReadinessReportAgent.inst) ComplianceReadinessReportAgent.inst = new ComplianceReadinessReportAgent();
    return ComplianceReadinessReportAgent.inst;
  }

  static reset(): void {
    ComplianceReadinessReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComplianceLlm();
  }

  async run(input: ComplianceInput): Promise<ComplianceOutput> {
    return runComplianceAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Executive readiness reporter top 1%; informe para auditor y C-suite sin hype.",
      mission:
        "Genera informe ejecutivo de readiness al framework declarado: estado, riesgos residuales, roadmap 90d y dependencias.",
      fewShotExample:
        '{"content":"COMPLY: resumen 1 pág + anexo gaps; honestidad sobre certificación vs readiness.","score":92,"controls":["Score readiness cualitativo alto en IAM","Documentación incident response completa"],"gaps":["Pentest externo pendiente","Logs centralizados <90d historial"]}',
    }, input);
  }
}

export function getComplianceReadinessReportAgent(): ComplianceReadinessReportAgent {
  return ComplianceReadinessReportAgent.instance;
}

export function resetComplianceReadinessReportAgentForTests(): void {
  ComplianceReadinessReportAgent.reset();
}
