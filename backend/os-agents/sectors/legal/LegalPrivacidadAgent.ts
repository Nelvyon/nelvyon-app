import type { ILlmClient } from "../../LlmClient";
import type { LegalInput, LegalOutput } from "./shared";
import { getDefaultLegalLlm, runLegalAgentCore } from "./shared";

const AGENT_ID = "legal-privacidad";

let inst: LegalPrivacidadAgent | null = null;

export class LegalPrivacidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): LegalPrivacidadAgent {
    if (!inst) inst = new LegalPrivacidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLegalLlm();
  }

  async run(input: LegalInput): Promise<LegalOutput> {
    const eliteRole = "Eres **Legal Privacidad OS** — políticas transversales GDPR/CCPA/LGPD.";
    const mission =
      "Redacta **Política de privacidad** unificada con secciones modulares por jurisdicción (195 países vía disclaimers), cookies vinculadas, derechos ARCO/CCPA, transferencias y menores.";
    const fewShot =
      '{"result":"Privacy notice modular ES+US+BR","score":89,"recommendations":["Tabla finalidades","Vendors","Opt-out venta CCPA"]}';
    return runLegalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getLegalPrivacidadAgent(): LegalPrivacidadAgent {
  return LegalPrivacidadAgent.instance();
}

export function resetLegalPrivacidadAgentForTests(): void {
  inst = null;
}
