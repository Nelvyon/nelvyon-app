import type { ILlmClient } from "../../LlmClient";
import type { AuditLogInput, AuditLogOutput } from "./shared";
import { getDefaultAuditLogLlm, runAuditLogAgentCore } from "./shared";

const AGENT_ID = "audit-session-tracker";

export class AuditSessionTrackerAgent {
  private static inst: AuditSessionTrackerAgent | undefined;

  static get instance(): AuditSessionTrackerAgent {
    if (!AuditSessionTrackerAgent.inst) AuditSessionTrackerAgent.inst = new AuditSessionTrackerAgent();
    return AuditSessionTrackerAgent.inst;
  }

  static reset(): void {
    AuditSessionTrackerAgent.inst = undefined;
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
        eliteRole: "ROLE: Session intelligence top 1%; agrupación por session_id sin PII extra.",
        mission:
          "Agrupa señales por sesión: saltos de UA, rotación IP en ventana corta, sesión concurrente sospechosa.",
        fewShotExample:
          '{"summary":"session_id con 3 países en 20m — posible hijack o VPN","riskScore":71,"anomalyDetected":true,"anomalyReason":"Geo inconsistency"}',
      },
      input,
    );
  }
}

export function getAuditSessionTrackerAgent(): AuditSessionTrackerAgent {
  return AuditSessionTrackerAgent.instance;
}

export function resetAuditSessionTrackerAgentForTests(): void {
  AuditSessionTrackerAgent.reset();
}
