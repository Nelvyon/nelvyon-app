import type { ILlmClient } from "../../LlmClient";
import type { LegalInput, LegalOutput } from "./shared";
import { getDefaultLegalLlm, runLegalAgentCore } from "./shared";

const AGENT_ID = "legal-contratos";

let inst: LegalContratosAgent | null = null;

export class LegalContratosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): LegalContratosAgent {
    if (!inst) inst = new LegalContratosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLegalLlm();
  }

  async run(input: LegalInput): Promise<LegalOutput> {
    const eliteRole = "Eres **Legal Contratos OS** — MSAs y anexos post-cierre.";
    const mission =
      "Produce **contratos de servicio automáticos post-cierre**: objeto, precio, entregables, IP, confidencialidad incorporada, SLA por referencia, terminación y responsabilidad limitada tipo hyperscaler.";
    const fewShot =
      '{"result":"MSA + SOW plantilla post-close","score":87,"recommendations":["Cap daños","Seguro cyber","Ley foro"]}';
    return runLegalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getLegalContratosAgent(): LegalContratosAgent {
  return LegalContratosAgent.instance();
}

export function resetLegalContratosAgentForTests(): void {
  inst = null;
}
