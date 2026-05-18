import type { ILlmClient } from "../../LlmClient";
import type { MfaInput, MfaOutput } from "./shared";
import { getDefaultMfaLlm, runMfaAgentCore } from "./shared";

const AGENT_ID = "mfa-setup-guide";

export class MfaSetupGuideAgent {
  private static inst: MfaSetupGuideAgent | undefined;

  static get instance(): MfaSetupGuideAgent {
    if (!MfaSetupGuideAgent.inst) MfaSetupGuideAgent.inst = new MfaSetupGuideAgent();
    return MfaSetupGuideAgent.inst;
  }

  static reset(): void {
    MfaSetupGuideAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMfaLlm();
  }

  async run(input: MfaInput): Promise<MfaOutput> {
    return runMfaAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Identity specialist top 1%; guías de alta adopción MFA sin ambigüedad operativa.",
      mission:
        "Genera guía personalizada de configuración 2FA por método (TOTP, SMS, email, códigos de respaldo) y contexto del sector.",
      fewShotExample:
        '{"content":"SECURE: Scan superficie cuenta; Evaluate TOTP vs SMS; Control app authenticator; Understand checklist usuario; Respond pérdida teléfono; Enforce política empresa.","score":93,"instructions":["Instalar app authenticator compatible RFC 6238","Escanear QR en portal seguridad","Guardar códigos de respaldo offline","Revocar SMS si migra a TOTP"],"securityTips":["No fotografiar secret seed","Rotar backup codes tras uso"]}',
    }, input);
  }
}

export function getMfaSetupGuideAgent(): MfaSetupGuideAgent {
  return MfaSetupGuideAgent.instance;
}

export function resetMfaSetupGuideAgentForTests(): void {
  MfaSetupGuideAgent.reset();
}
