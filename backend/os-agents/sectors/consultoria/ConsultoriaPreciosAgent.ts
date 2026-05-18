import type { ILlmClient } from "../../LlmClient";
import type { ConsultoriaInput, ConsultoriaOutput } from "./shared";
import { getDefaultConsultoriaLlm, runConsultoriaAgentCore } from "./shared";

const AGENT_ID = "consultoria-precios";

export class ConsultoriaPreciosAgent {
  private static inst: ConsultoriaPreciosAgent | undefined;

  static get instance(): ConsultoriaPreciosAgent {
    if (!ConsultoriaPreciosAgent.inst) ConsultoriaPreciosAgent.inst = new ConsultoriaPreciosAgent();
    return ConsultoriaPreciosAgent.inst;
  }

  static reset(): void {
    ConsultoriaPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultConsultoriaLlm();
  }

  async run(input: ConsultoriaInput): Promise<ConsultoriaOutput> {
    const eliteRole = "Eres **Consultoría Precios** — consulting y propuestas.";
    const mission = "Estructura **pricing de servicios consulting** y plantillas de propuestas.";
    const fewShot =
      '{"result":"Pricing consulting + propuestas management","score":91,"recommendations":["Value-based fees","Paquetes diagnóstico"]}';
    return runConsultoriaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getConsultoriaPreciosAgent(): ConsultoriaPreciosAgent {
  return ConsultoriaPreciosAgent.instance;
}

export function resetConsultoriaPreciosAgentForTests(): void {
  ConsultoriaPreciosAgent.reset();
}
