import type { ILlmClient } from "../../LlmClient";
import type { AuditLogInput, AuditLogOutput } from "./shared";
import { getDefaultAuditLogLlm, runAuditLogAgentCore } from "./shared";

const AGENT_ID = "audit-compliance-reporter";

export class AuditComplianceReporterAgent {
  private static inst: AuditComplianceReporterAgent | undefined;

  static get instance(): AuditComplianceReporterAgent {
    if (!AuditComplianceReporterAgent.inst) AuditComplianceReporterAgent.inst = new AuditComplianceReporterAgent();
    return AuditComplianceReporterAgent.inst;
  }

  static reset(): void {
    AuditComplianceReporterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAuditLogLlm();
  }

  async run(input: AuditLogInput): Promise<AuditLogOutput> {
    return runAuditLogAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: SOC2/GDPR readiness reporter top 1%; extractos audit-friendly.",
        mission:
          "Resume actividad orientativa para auditor: categorías de eventos, retención referenciada, minimización.",
        fewShotExample:
          '{"summary":"Informe actividad 30d — MFA + exports trazados","riskScore":22,"anomalyDetected":false,"anomalyReason":""}',
      },
      input,
    );
  }
}

export function getAuditComplianceReporterAgent(): AuditComplianceReporterAgent {
  return AuditComplianceReporterAgent.instance;
}

export function resetAuditComplianceReporterAgentForTests(): void {
  AuditComplianceReporterAgent.reset();
}
