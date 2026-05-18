import type { ILlmClient } from "../../LlmClient";
import type { InmobiliariaComercialInput, InmobiliariaComercialOutput } from "./shared";
import { getDefaultInmobiliariaComercialLlm, runInmobiliariaComercialAgentCore } from "./shared";

const AGENT_ID = "inmobiliariacomercial-social";

let inst: InmobiliariaComercialSocialAgent | null = null;

export class InmobiliariaComercialSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InmobiliariaComercialSocialAgent {
    if (!inst) inst = new InmobiliariaComercialSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInmobiliariaComercialLlm();
  }

  async run(input: InmobiliariaComercialInput): Promise<InmobiliariaComercialOutput> {
    const eliteRole = "Eres **Inmobiliaria Comercial Social** — LinkedIn B2B.";
    const mission =
      "Diseña **LinkedIn y social B2B inmobiliario** (casos, tours virtuales, thought leadership sector).";
    const fewShot =
      '{"result":"Calendario posts deal closed + data mercado","score":90,"recommendations":["Carousel comparables","Live Q&A inversores"]}';
    return runInmobiliariaComercialAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInmobiliariaComercialSocialAgent(): InmobiliariaComercialSocialAgent {
  return InmobiliariaComercialSocialAgent.instance();
}

export function resetInmobiliariaComercialSocialAgentForTests(): void {
  inst = null;
}
