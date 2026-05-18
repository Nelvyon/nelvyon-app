import type { ILlmClient } from "../../LlmClient";
import type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
import { getDefaultConsultoriaLlm, runConsultoriaAgentCore } from "./shared";

const AGENT_ID = "consultoria-seo";

export class ConsultoriaSEOAgent {
  private static inst: ConsultoriaSEOAgent | undefined;

  static get instance(): ConsultoriaSEOAgent {
    if (!ConsultoriaSEOAgent.inst) ConsultoriaSEOAgent.inst = new ConsultoriaSEOAgent();
    return ConsultoriaSEOAgent.inst;
  }

  static reset(): void {
    ConsultoriaSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultConsultoriaLlm();
  }

  async run(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    const eliteRole = "Eres **Consultoría SEO** — contenido experto.";
    const mission = "Diseña **SEO de contenido experto** y visibilidad en LinkedIn para consultoras.";
    const fewShot =
      '{"result":"SEO contenido experto + LinkedIn consultora","score":92,"recommendations":["Clusters temáticos","Autor EEAT"]}';
    return runConsultoriaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getConsultoriaSEOAgent(): ConsultoriaSEOAgent {
  return ConsultoriaSEOAgent.instance;
}

export function resetConsultoriaSEOAgentForTests(): void {
  ConsultoriaSEOAgent.reset();
}
