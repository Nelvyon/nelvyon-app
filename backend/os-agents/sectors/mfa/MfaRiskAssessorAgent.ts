import type { ILlmClient } from "../../LlmClient";
import type { MfaInput, MfaOutput } from "./shared";
import { getDefaultMfaLlm, runMfaAgentCore } from "./shared";

const AGENT_ID = "mfa-risk-assessor";

export class MfaRiskAssessorAgent {
  private static inst: MfaRiskAssessorAgent | undefined;

  static get instance(): MfaRiskAssessorAgent {
    if (!MfaRiskAssessorAgent.inst) MfaRiskAssessorAgent.inst = new MfaRiskAssessorAgent();
    return MfaRiskAssessorAgent.inst;
  }

  static reset(): void {
    MfaRiskAssessorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMfaLlm();
  }

  async run(input: MfaInput): Promise<MfaOutput> {
    return runMfaAgentCore(AGENT_ID, this.llm, {
      eliteRole:
        "ROLE: Threat modeling SME top 1%; clasificación de riesgo para MFA sin alarmismo.",
      mission:
        "Evalúa nivel de riesgo de la cuenta según sector y señales del brief; recomienda método MFA óptimo y factores adicionales.",
      fewShotExample:
        '{"content":"SECURE aplicado: Scan phishing sector financiero; Evaluate SIM-swap vs TOTP; Control hardware key opcional; Understand comunicación al usuario; Respond escalación; Enforce revisión trimestral.","score":90,"instructions":["Clasificar riesgo según datos declarados","Preferir WebAuthn/TOTP frente a SMS en alto riesgo","Documentar excepciones y compensaciones"],"securityTips":["SIM swapping mitigado con app authenticator","FIDO2 donde el sector lo permita"]}',
    }, input);
  }
}

export function getMfaRiskAssessorAgent(): MfaRiskAssessorAgent {
  return MfaRiskAssessorAgent.instance;
}

export function resetMfaRiskAssessorAgentForTests(): void {
  MfaRiskAssessorAgent.reset();
}
