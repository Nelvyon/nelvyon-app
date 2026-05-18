import type { ILlmClient } from "../../LlmClient";
import type { InmobiliariaComercialInput, InmobiliariaComercialOutput } from "./shared";
import { getDefaultInmobiliariaComercialLlm, runInmobiliariaComercialAgentCore } from "./shared";

const AGENT_ID = "inmobiliariacomercial-listings";

let inst: InmobiliariaComercialListingsAgent | null = null;

export class InmobiliariaComercialListingsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InmobiliariaComercialListingsAgent {
    if (!inst) inst = new InmobiliariaComercialListingsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInmobiliariaComercialLlm();
  }

  async run(input: InmobiliariaComercialInput): Promise<InmobiliariaComercialOutput> {
    const eliteRole = "Eres **Inmobiliaria Comercial Listings** — fichas y portales.";
    const mission =
      "Diseña **gestión y optimización de listings** (fotos, specs técnicas, CTAs y consistencia multi-portal).";
    const fewShot =
      '{"result":"Checklist ficha B2B + plantillas","score":92,"recommendations":["Plano CAD resumido","Video walkthrough"]}';
    return runInmobiliariaComercialAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInmobiliariaComercialListingsAgent(): InmobiliariaComercialListingsAgent {
  return InmobiliariaComercialListingsAgent.instance();
}

export function resetInmobiliariaComercialListingsAgentForTests(): void {
  inst = null;
}
