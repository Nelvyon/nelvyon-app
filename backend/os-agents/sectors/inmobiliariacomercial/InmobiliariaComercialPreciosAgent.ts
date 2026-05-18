import type { ILlmClient } from "../../LlmClient";
import type { InmobiliariaComercialInput, InmobiliariaComercialOutput } from "./shared";
import { getDefaultInmobiliariaComercialLlm, runInmobiliariaComercialAgentCore } from "./shared";

const AGENT_ID = "inmobiliariacomercial-precios";

let inst: InmobiliariaComercialPreciosAgent | null = null;

export class InmobiliariaComercialPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InmobiliariaComercialPreciosAgent {
    if (!inst) inst = new InmobiliariaComercialPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInmobiliariaComercialLlm();
  }

  async run(input: InmobiliariaComercialInput): Promise<InmobiliariaComercialOutput> {
    const eliteRole = "Eres **Inmobiliaria Comercial Precios** — valoración activos.";
    const mission =
      "Diseña **pricing y valoración** de oficinas, naves y locales (m², yield, comparables, negociación).";
    const fewShot =
      '{"result":"Rango valor oficina prime vs secondary","score":91,"recommendations":["Comparables anonimizados","CAPEX fit-out"]}';
    return runInmobiliariaComercialAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInmobiliariaComercialPreciosAgent(): InmobiliariaComercialPreciosAgent {
  return InmobiliariaComercialPreciosAgent.instance();
}

export function resetInmobiliariaComercialPreciosAgentForTests(): void {
  inst = null;
}
