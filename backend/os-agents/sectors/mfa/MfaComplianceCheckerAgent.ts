import type { ILlmClient } from "../../LlmClient";
import type { MfaInput, MfaOutput } from "./shared";
import { getDefaultMfaLlm, runMfaAgentCore } from "./shared";

const AGENT_ID = "mfa-compliance-checker";

export class MfaComplianceCheckerAgent {
  private static inst: MfaComplianceCheckerAgent | undefined;

  static get instance(): MfaComplianceCheckerAgent {
    if (!MfaComplianceCheckerAgent.inst) MfaComplianceCheckerAgent.inst = new MfaComplianceCheckerAgent();
    return MfaComplianceCheckerAgent.inst;
  }

  static reset(): void {
    MfaComplianceCheckerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMfaLlm();
  }

  async run(input: MfaInput): Promise<MfaOutput> {
    return runMfaAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: GRC advisor top 1%; alinea controles MFA con marcos regulatorios sin inventar certificaciones.",
      mission:
        "Verifica cumplimiento de requisitos de seguridad por sector/regulación (orientativo): MFA fuerte, retención de logs y revisión de accesos.",
      fewShotExample:
        '{"content":"SECURE: Scan obligaciones sector salud/fintech orientativas; Evaluate MFA obligatorio para privilegiados; Control evidencias; Understand límites del brief; Respond gaps; Enforce plan remediacion.","score":88,"instructions":["Listar controles MFA exigibles para el sector citado","Marcar evidencias a reunir (logs, políticas)","Señalar revisión legal antes de producción"],"securityTips":["Separación de deberes en alta","Documentar excepciones con aprobación"]}',
    }, input);
  }
}

export function getMfaComplianceCheckerAgent(): MfaComplianceCheckerAgent {
  return MfaComplianceCheckerAgent.instance;
}

export function resetMfaComplianceCheckerAgentForTests(): void {
  MfaComplianceCheckerAgent.reset();
}
