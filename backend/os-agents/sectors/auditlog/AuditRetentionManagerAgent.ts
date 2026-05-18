import type { ILlmClient } from "../../LlmClient";
import type { AuditLogInput, AuditLogOutput } from "./shared";
import { getDefaultAuditLogLlm, runAuditLogAgentCore } from "./shared";

const AGENT_ID = "audit-retention-manager";

export class AuditRetentionManagerAgent {
  private static inst: AuditRetentionManagerAgent | undefined;

  static get instance(): AuditRetentionManagerAgent {
    if (!AuditRetentionManagerAgent.inst) AuditRetentionManagerAgent.inst = new AuditRetentionManagerAgent();
    return AuditRetentionManagerAgent.inst;
  }

  static reset(): void {
    AuditRetentionManagerAgent.inst = undefined;
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
        eliteRole: "ROLE: Records management top 1%; políticas de retención sin borrar audit trail indebidamente.",
        mission:
          "Gestiona períodos: 90d activos consultables app, 2y archivo frío (orientativo); sin ejecutar DELETE en tabla inmutable aquí.",
        fewShotExample:
          '{"summary":"Política alineada — archivo fuera de hot store tras 90d","riskScore":18,"anomalyDetected":false,"anomalyReason":""}',
      },
      input,
    );
  }
}

export function getAuditRetentionManagerAgent(): AuditRetentionManagerAgent {
  return AuditRetentionManagerAgent.instance;
}

export function resetAuditRetentionManagerAgentForTests(): void {
  AuditRetentionManagerAgent.reset();
}
