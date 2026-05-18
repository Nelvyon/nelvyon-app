import type { ILlmClient } from "../../LlmClient";
import type { InmobiliariaComercialInput, InmobiliariaComercialOutput } from "./shared";
import { getDefaultInmobiliariaComercialLlm, runInmobiliariaComercialAgentCore } from "./shared";

const AGENT_ID = "inmobiliariacomercial-seo";

let inst: InmobiliariaComercialSEOAgent | null = null;

export class InmobiliariaComercialSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InmobiliariaComercialSEOAgent {
    if (!inst) inst = new InmobiliariaComercialSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInmobiliariaComercialLlm();
  }

  async run(input: InmobiliariaComercialInput): Promise<InmobiliariaComercialOutput> {
    const eliteRole = "Eres **Inmobiliaria Comercial SEO** — portales B2B.";
    const mission =
      "Diseña **SEO para portales inmobiliarios B2B** (clusters zona, tipo activo, landing transaccional).";
    const fewShot =
      '{"result":"Mapa keywords nave logística Madrid","score":92,"recommendations":["FAQ arrendamiento","Schema LocalBusiness"]}';
    return runInmobiliariaComercialAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInmobiliariaComercialSEOAgent(): InmobiliariaComercialSEOAgent {
  return InmobiliariaComercialSEOAgent.instance();
}

export function resetInmobiliariaComercialSEOAgentForTests(): void {
  inst = null;
}
