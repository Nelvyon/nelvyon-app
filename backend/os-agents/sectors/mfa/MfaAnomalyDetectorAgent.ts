import type { ILlmClient } from "../../LlmClient";
import type { MfaInput, MfaOutput } from "./shared";
import { getDefaultMfaLlm, runMfaAgentCore } from "./shared";

const AGENT_ID = "mfa-anomaly-detector";

export class MfaAnomalyDetectorAgent {
  private static inst: MfaAnomalyDetectorAgent | undefined;

  static get instance(): MfaAnomalyDetectorAgent {
    if (!MfaAnomalyDetectorAgent.inst) MfaAnomalyDetectorAgent.inst = new MfaAnomalyDetectorAgent();
    return MfaAnomalyDetectorAgent.inst;
  }

  static reset(): void {
    MfaAnomalyDetectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMfaLlm();
  }

  async run(input: MfaInput): Promise<MfaOutput> {
    return runMfaAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: SOC analyst top 1%; señales de acceso anómalo y respuesta proporcional.",
      mission:
        "Detecta patrones de acceso anómalos descritos o inferibles del brief y sugiere acciones (step-up MFA, bloqueo, revisión).",
      fewShotExample:
        '{"content":"SECURE: Scan geo velocity imposible; Evaluate nuevo dispositivo; Control umbral fallos OTP; Understand alertas SOC; Respond playbooks; Enforce retención logs.","score":89,"instructions":["Definir reglas de nuevo país + nueva hora","Escalonar challenge MFA en score alto","Notificar usuario por canal secundario verificado"],"securityTips":["Correlacionar IP con histórico","Rate-limit verify endpoints"]}',
    }, input);
  }
}

export function getMfaAnomalyDetectorAgent(): MfaAnomalyDetectorAgent {
  return MfaAnomalyDetectorAgent.instance;
}

export function resetMfaAnomalyDetectorAgentForTests(): void {
  MfaAnomalyDetectorAgent.reset();
}
