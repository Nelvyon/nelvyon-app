import type { ILlmClient } from "../../LlmClient";
import type { InmobiliariaComercialInput, InmobiliariaComercialOutput } from "./shared";
import { getDefaultInmobiliariaComercialLlm, runInmobiliariaComercialAgentCore } from "./shared";

const AGENT_ID = "inmobiliariacomercial-email";

let inst: InmobiliariaComercialEmailAgent | null = null;

export class InmobiliariaComercialEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InmobiliariaComercialEmailAgent {
    if (!inst) inst = new InmobiliariaComercialEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInmobiliariaComercialLlm();
  }

  async run(input: InmobiliariaComercialInput): Promise<InmobiliariaComercialOutput> {
    const eliteRole = "Eres **Inmobiliaria Comercial Email** — nurturing B2B.";
    const mission =
      "Diseña **email nurturing** para inversores y empresas (pipeline oportunidades, visitas, follow-up DD).";
    const fewShot =
      '{"result":"Secuencia 5 mails post-visita nave","score":91,"recommendations":["One-pager PDF","Trigger sin respuesta 7d"]}';
    return runInmobiliariaComercialAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInmobiliariaComercialEmailAgent(): InmobiliariaComercialEmailAgent {
  return InmobiliariaComercialEmailAgent.instance();
}

export function resetInmobiliariaComercialEmailAgentForTests(): void {
  inst = null;
}
