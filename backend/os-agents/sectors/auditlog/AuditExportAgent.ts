import type { ILlmClient } from "../../LlmClient";
import type { AuditLogInput, AuditLogOutput } from "./shared";
import { getDefaultAuditLogLlm, runAuditLogAgentCore } from "./shared";

const AGENT_ID = "audit-export-agent";

export class AuditExportAgent {
  private static inst: AuditExportAgent | undefined;

  static get instance(): AuditExportAgent {
    if (!AuditExportAgent.inst) AuditExportAgent.inst = new AuditExportAgent();
    return AuditExportAgent.inst;
  }

  static reset(): void {
    AuditExportAgent.inst = undefined;
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
        eliteRole: "ROLE: Forensic export SME top 1%; CSV/JSON firmado orientativo.",
        mission:
          "Define paquete export: columnas mínimas, hash SHA-256 declarado en metadata, ventana temporal.",
        fewShotExample:
          '{"summary":"EXPORT_REQUESTED — incluir checksum manifest","riskScore":35,"anomalyDetected":false,"anomalyReason":""}',
      },
      input,
    );
  }
}

export function getAuditExportAgent(): AuditExportAgent {
  return AuditExportAgent.instance;
}

export function resetAuditExportAgentForTests(): void {
  AuditExportAgent.reset();
}
