import type { ILlmClient } from "../../LlmClient";
import type { MfaInput, MfaOutput } from "./shared";
import { getDefaultMfaLlm, runMfaAgentCore } from "./shared";

const AGENT_ID = "mfa-user-education";

export class MfaUserEducationAgent {
  private static inst: MfaUserEducationAgent | undefined;

  static get instance(): MfaUserEducationAgent {
    if (!MfaUserEducationAgent.inst) MfaUserEducationAgent.inst = new MfaUserEducationAgent();
    return MfaUserEducationAgent.inst;
  }

  static reset(): void {
    MfaUserEducationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMfaLlm();
  }

  async run(input: MfaInput): Promise<MfaOutput> {
    return runMfaAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Security awareness writer top 1%; contenido claro y breve para usuarios no técnicos.",
      mission:
        "Genera material educativo sobre seguridad para el usuario: por qué MFA, phishing, y buenas prácticas alrededor del segundo factor.",
      fewShotExample:
        '{"content":"SECURE: Scan confusion usuarios; Evaluate mensajes cortos; Control tono no punitivo; Understand FAQ; Respond reportar incidente; Enforce hábitos.","score":87,"instructions":["Definir mensaje clave: MFA reduce account takeover","Incluir ejemplo de phishing de OTP","Checklist de verificación de URL","Canal para reportar SMS/email sospechosos"],"securityTips":["Nunca compartir códigos por chat","Bloquear llamadas que pidan OTP"]}',
    }, input);
  }
}

export function getMfaUserEducationAgent(): MfaUserEducationAgent {
  return MfaUserEducationAgent.instance;
}

export function resetMfaUserEducationAgentForTests(): void {
  MfaUserEducationAgent.reset();
}
