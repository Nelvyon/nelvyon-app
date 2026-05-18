import type { ILlmClient } from "../../LlmClient";
import type { MfaInput, MfaOutput } from "./shared";
import { getDefaultMfaLlm, runMfaAgentCore } from "./shared";

const AGENT_ID = "mfa-recovery-flow";

export class MfaRecoveryFlowAgent {
  private static inst: MfaRecoveryFlowAgent | undefined;

  static get instance(): MfaRecoveryFlowAgent {
    if (!MfaRecoveryFlowAgent.inst) MfaRecoveryFlowAgent.inst = new MfaRecoveryFlowAgent();
    return MfaRecoveryFlowAgent.inst;
  }

  static reset(): void {
    MfaRecoveryFlowAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMfaLlm();
  }

  async run(input: MfaInput): Promise<MfaOutput> {
    return runMfaAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: IAM procedures architect top 1%; recuperación segura sin puerta trasera informal.",
      mission:
        "Diseña flujo de recuperación de cuenta si el usuario pierde el 2FA: verificación escalonada, tiempos de espera y controles anti-fraude.",
      fewShotExample:
        '{"content":"SECURE: Scan vectores de takeover en recovery; Evaluate prueba posesión; Control límites intentos; Understand mensajes al usuario; Respond ticket manual; Enforce logging.","score":91,"instructions":["Paso 1: verificación email + dispositivo conocido","Paso 2: revisión humana si alto riesgo","Cooldown antes de reemitir factor","Revocar sesiones previas al restablecer MFA"],"securityTips":["Nunca enviar nuevo secreto por email plano","Registrar IPs en recuperación"]}',
    }, input);
  }
}

export function getMfaRecoveryFlowAgent(): MfaRecoveryFlowAgent {
  return MfaRecoveryFlowAgent.instance;
}

export function resetMfaRecoveryFlowAgentForTests(): void {
  MfaRecoveryFlowAgent.reset();
}
