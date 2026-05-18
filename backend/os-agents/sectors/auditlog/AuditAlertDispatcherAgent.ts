import type { ILlmClient } from "../../LlmClient";
import type { AuditLogInput, AuditLogOutput } from "./shared";
import { getDefaultAuditLogLlm, runAuditLogAgentCore } from "./shared";

const AGENT_ID = "audit-alert-dispatcher";

export class AuditAlertDispatcherAgent {
  private static inst: AuditAlertDispatcherAgent | undefined;

  static get instance(): AuditAlertDispatcherAgent {
    if (!AuditAlertDispatcherAgent.inst) AuditAlertDispatcherAgent.inst = new AuditAlertDispatcherAgent();
    return AuditAlertDispatcherAgent.inst;
  }

  static reset(): void {
    AuditAlertDispatcherAgent.inst = undefined;
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
        eliteRole: "ROLE: Alert routing top 1%; paging proporcional a severidad.",
        mission:
          "Propone dispatch: canal ops vs usuario, templado mensaje y escalación si riskScore>80 o anomalyDetected.",
        fewShotExample:
          '{"summary":"Alerta alta — MFA_DISABLED + nueva IP en 5m","riskScore":88,"anomalyDetected":true,"anomalyReason":"Combinación crítica"}',
      },
      input,
    );
  }
}

export function getAuditAlertDispatcherAgent(): AuditAlertDispatcherAgent {
  return AuditAlertDispatcherAgent.instance;
}

export function resetAuditAlertDispatcherAgentForTests(): void {
  AuditAlertDispatcherAgent.reset();
}
