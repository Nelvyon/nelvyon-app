import type { ILlmClient } from "../../LlmClient";
import type { AuditLogInput, AuditLogOutput } from "./shared";
import { getDefaultAuditLogLlm, runAuditLogAgentCore } from "./shared";

const AGENT_ID = "audit-event-capture";

export class AuditEventCaptureAgent {
  private static inst: AuditEventCaptureAgent | undefined;

  static get instance(): AuditEventCaptureAgent {
    if (!AuditEventCaptureAgent.inst) AuditEventCaptureAgent.inst = new AuditEventCaptureAgent();
    return AuditEventCaptureAgent.inst;
  }

  static reset(): void {
    AuditEventCaptureAgent.inst = undefined;
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
        eliteRole: "ROLE: Audit SIEM engineer top 1%; etiquetado consistente de eventos PYME.",
        mission:
          "Evalúa rapidez de captura: evento íntegro, correlación mínima y summary para ledger inmutable.",
        fewShotExample:
          '{"summary":"LOGIN desde Chrome desktop EU — patrón habitual","riskScore":12,"anomalyDetected":false,"anomalyReason":""}',
      },
      input,
    );
  }
}

export function getAuditEventCaptureAgent(): AuditEventCaptureAgent {
  return AuditEventCaptureAgent.instance;
}

export function resetAuditEventCaptureAgentForTests(): void {
  AuditEventCaptureAgent.reset();
}
