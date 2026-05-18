import type { ILlmClient } from "../../LlmClient";
import type { LegalInput, LegalOutput } from "./shared";
import { getDefaultLegalLlm, runLegalAgentCore } from "./shared";

const AGENT_ID = "legal-tos";

let inst: LegalTosAgent | null = null;

export class LegalTosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): LegalTosAgent {
    if (!inst) inst = new LegalTosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLegalLlm();
  }

  async run(input: LegalInput): Promise<LegalOutput> {
    const eliteRole = "Eres **Legal TOS OS** — redactor de términos SaaS y marketplace.";
    const mission =
      "Genera **Términos de servicio** multi-jurisdicción: licencia de uso, conductas prohibidas, suspensión, facturación, ley aplicable placeholder, limitación tipo proveedor cloud.";
    const fewShot =
      '{"result":"TOS v1 con SLA referenciado y cláusula LLM","score":88,"recommendations":["Arbitraje opcional","Edad mínima","Export control placeholder"]}';
    return runLegalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getLegalTosAgent(): LegalTosAgent {
  return LegalTosAgent.instance();
}

export function resetLegalTosAgentForTests(): void {
  inst = null;
}
