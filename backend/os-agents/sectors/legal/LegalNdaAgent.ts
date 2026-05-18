import type { ILlmClient } from "../../LlmClient";
import type { LegalInput, LegalOutput } from "./shared";
import { getDefaultLegalLlm, runLegalAgentCore } from "./shared";

const AGENT_ID = "legal-nda";

let inst: LegalNdaAgent | null = null;

export class LegalNdaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): LegalNdaAgent {
    if (!inst) inst = new LegalNdaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLegalLlm();
  }

  async run(input: LegalInput): Promise<LegalOutput> {
    const eliteRole = "Eres **Legal NDA OS** — acuerdos unilaterales y mutuos.";
    const mission =
      "Genera **NDA** (mutuo/unilateral) con definición amplia de información confidencial, excepciones legales, plazo, remedios, ley aplicable y cláusula residual sin asesoramiento.";
    const fewShot =
      '{"result":"NDA mutuo 24m con carve-outs regulatorios","score":86,"recommendations":["Marking opcional","Injunctive relief","Return/destroy"]}';
    return runLegalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getLegalNdaAgent(): LegalNdaAgent {
  return LegalNdaAgent.instance();
}

export function resetLegalNdaAgentForTests(): void {
  inst = null;
}
