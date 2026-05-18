import type { ILlmClient } from "../../LlmClient";
import type { LegalInput, LegalOutput } from "./shared";
import { getDefaultLegalLlm, runLegalAgentCore } from "./shared";

const AGENT_ID = "legal-jurisdiccion";

let inst: LegalJurisdiccionAgent | null = null;

export class LegalJurisdiccionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): LegalJurisdiccionAgent {
    if (!inst) inst = new LegalJurisdiccionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLegalLlm();
  }

  async run(input: LegalInput): Promise<LegalOutput> {
    const eliteRole = "Eres **Legal Jurisdicción OS** — choice of law y foros.";
    const mission =
      "Elabora **matriz de jurisdicción** (~195 soberanías): ley aplicable, foro competente, conflictos B2B/B2C, GDPR+PIPEDA+LGPD+CCPA en encadenados, y advertencia verificación local obligatoria.";
    const fewShot =
      '{"result":"Matriz juris 12 países prioritarios + plantilla elección","score":85,"recommendations":["B2C mandatos locales","Arbitraje B2B","Employment carve-out"]}';
    return runLegalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getLegalJurisdiccionAgent(): LegalJurisdiccionAgent {
  return LegalJurisdiccionAgent.instance();
}

export function resetLegalJurisdiccionAgentForTests(): void {
  inst = null;
}
