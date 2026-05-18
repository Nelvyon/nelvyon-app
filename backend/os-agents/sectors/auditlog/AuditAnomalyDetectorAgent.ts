import type { ILlmClient } from "../../LlmClient";
import type { AuditLogInput, AuditLogOutput } from "./shared";
import { getDefaultAuditLogLlm, runAuditLogAgentCore } from "./shared";

const AGENT_ID = "audit-anomaly-detector";

export class AuditAnomalyDetectorAgent {
  private static inst: AuditAnomalyDetectorAgent | undefined;

  static get instance(): AuditAnomalyDetectorAgent {
    if (!AuditAnomalyDetectorAgent.inst) AuditAnomalyDetectorAgent.inst = new AuditAnomalyDetectorAgent();
    return AuditAnomalyDetectorAgent.inst;
  }

  static reset(): void {
    AuditAnomalyDetectorAgent.inst = undefined;
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
        eliteRole: "ROLE: UEBA lite top 1%; falsos positivos bajo para PYME.",
        mission:
          "Detecta patrones anómalos: geo velocity imposible, burst CONTENT_GENERATED, API_KEY tras churn.",
        fewShotExample:
          '{"summary":"50 CONTENT_GENERATED/h desde nueva IP — burst atípico","riskScore":78,"anomalyDetected":true,"anomalyReason":"Throughput fuera de baseline declarado"}',
      },
      input,
    );
  }
}

export function getAuditAnomalyDetectorAgent(): AuditAnomalyDetectorAgent {
  return AuditAnomalyDetectorAgent.instance;
}

export function resetAuditAnomalyDetectorAgentForTests(): void {
  AuditAnomalyDetectorAgent.reset();
}
