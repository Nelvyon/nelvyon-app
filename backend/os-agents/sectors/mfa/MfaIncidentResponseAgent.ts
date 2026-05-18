import type { ILlmClient } from "../../LlmClient";
import type { MfaInput, MfaOutput } from "./shared";
import { getDefaultMfaLlm, runMfaAgentCore } from "./shared";

const AGENT_ID = "mfa-incident-response";

export class MfaIncidentResponseAgent {
  private static inst: MfaIncidentResponseAgent | undefined;

  static get instance(): MfaIncidentResponseAgent {
    if (!MfaIncidentResponseAgent.inst) MfaIncidentResponseAgent.inst = new MfaIncidentResponseAgent();
    return MfaIncidentResponseAgent.inst;
  }

  static reset(): void {
    MfaIncidentResponseAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMfaLlm();
  }

  async run(input: MfaInput): Promise<MfaOutput> {
    return runMfaAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: IR lead top 1%; respuesta coordinada ante intentos de acceso no autorizado.",
      mission:
        "Genera protocolo de respuesta ante intento de acceso no autorizado: contención, revocación de sesiones, notificación y post-mortem.",
      fewShotExample:
        '{"content":"SECURE: Scan alerta brute-force OTP; Evaluate impacto cuentas; Control kill sessions; Understand comunicación usuario; Respond preservación evidencias; Enforce cambio credenciales.","score":92,"instructions":["T0: bloquear IP/rango tras umbral","T1: invalidar refresh tokens afectados","T2: forzar re-login + step-up MFA","T3: ticket SOC con timeline"],"securityTips":["No revelar detalles internos al atacante","Activar canales out-of-band verificados"]}',
    }, input);
  }
}

export function getMfaIncidentResponseAgent(): MfaIncidentResponseAgent {
  return MfaIncidentResponseAgent.instance;
}

export function resetMfaIncidentResponseAgentForTests(): void {
  MfaIncidentResponseAgent.reset();
}
