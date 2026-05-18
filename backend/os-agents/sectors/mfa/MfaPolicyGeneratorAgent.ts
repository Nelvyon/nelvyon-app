import type { ILlmClient } from "../../LlmClient";
import type { MfaInput, MfaOutput } from "./shared";
import { getDefaultMfaLlm, runMfaAgentCore } from "./shared";

const AGENT_ID = "mfa-policy-generator";

export class MfaPolicyGeneratorAgent {
  private static inst: MfaPolicyGeneratorAgent | undefined;

  static get instance(): MfaPolicyGeneratorAgent {
    if (!MfaPolicyGeneratorAgent.inst) MfaPolicyGeneratorAgent.inst = new MfaPolicyGeneratorAgent();
    return MfaPolicyGeneratorAgent.inst;
  }

  static reset(): void {
    MfaPolicyGeneratorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMfaLlm();
  }

  async run(input: MfaInput): Promise<MfaOutput> {
    return runMfaAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Policy drafter top 1%; políticas de acceso claras y auditables.",
      mission:
        "Genera política de seguridad de acceso adaptada al sector: alcance, MFA obligatorio, excepciones, revisión y sanciones orientativas.",
      fewShotExample:
        '{"content":"SECURE: Scan roles administrativos; Evaluate MFA everywhere; Control contraseña + MFA; Understand BYOD si aplica; Respond incidentes; Enforce revision anual.","score":90,"instructions":["Alcance: usuarios internos y contratistas","MFA obligatorio para todos los accesos cloud","Prohibición compartir OTP bajo disciplina","Excepciones solo con aprobación CISO"],"securityTips":["Registro de dispositivos confiables","Sesiones cortas en equipos compartidos"]}',
    }, input);
  }
}

export function getMfaPolicyGeneratorAgent(): MfaPolicyGeneratorAgent {
  return MfaPolicyGeneratorAgent.instance;
}

export function resetMfaPolicyGeneratorAgentForTests(): void {
  MfaPolicyGeneratorAgent.reset();
}
