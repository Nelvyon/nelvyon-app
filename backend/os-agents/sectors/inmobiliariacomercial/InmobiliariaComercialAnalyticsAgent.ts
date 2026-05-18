import type { ILlmClient } from "../../LlmClient";
import type { InmobiliariaComercialInput, InmobiliariaComercialOutput } from "./shared";
import { getDefaultInmobiliariaComercialLlm, runInmobiliariaComercialAgentCore } from "./shared";

const AGENT_ID = "inmobiliariacomercial-analytics";

let inst: InmobiliariaComercialAnalyticsAgent | null = null;

export class InmobiliariaComercialAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InmobiliariaComercialAnalyticsAgent {
    if (!inst) inst = new InmobiliariaComercialAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInmobiliariaComercialLlm();
  }

  async run(input: InmobiliariaComercialInput): Promise<InmobiliariaComercialOutput> {
    const eliteRole = "Eres **Inmobiliaria Comercial Analytics** — leads y conversión.";
    const mission =
      "Diseña **analytics de leads**, **visitas a activo** y **conversión** (embudo CRM, fuentes, tiempo ciclo).";
    const fewShot =
      '{"result":"North Star visitas cualificadas + win rate","score":92,"recommendations":["Atribución portal vs outbound","SLA respuesta lead"]}';
    return runInmobiliariaComercialAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInmobiliariaComercialAnalyticsAgent(): InmobiliariaComercialAnalyticsAgent {
  return InmobiliariaComercialAnalyticsAgent.instance();
}

export function resetInmobiliariaComercialAnalyticsAgentForTests(): void {
  inst = null;
}
