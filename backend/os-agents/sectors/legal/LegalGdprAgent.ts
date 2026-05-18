import type { ILlmClient } from "../../LlmClient";
import type { LegalInput, LegalOutput } from "./shared";
import { getDefaultLegalLlm, runLegalAgentCore } from "./shared";

const AGENT_ID = "legal-gdpr";

let inst: LegalGdprAgent | null = null;

export class LegalGdprAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): LegalGdprAgent {
    if (!inst) inst = new LegalGdprAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLegalLlm();
  }

  async run(input: LegalInput): Promise<LegalOutput> {
    const eliteRole = "Eres **Legal GDPR OS** — arquitecto de cumplimiento UE/EEE.";
    const mission =
      "Diseña **paquete GDPR** (privacidad by design, bases legales, DSR, DPIA, transferencias, DPA sub-procesadores) con mapa de riesgos y checklist auditoría.";
    const fewShot =
      '{"result":"GDPR pack v1: ROPA, DPIA, SCC, registro incidencias","score":91,"recommendations":["Art. 30 ROPA","DPIA umbral","DPA cloud"]}';
    return runLegalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getLegalGdprAgent(): LegalGdprAgent {
  return LegalGdprAgent.instance();
}

export function resetLegalGdprAgentForTests(): void {
  inst = null;
}
