import type { ILlmClient } from "../../LlmClient";
import type { InmobiliariaComercialInput, InmobiliariaComercialOutput } from "./shared";
import { getDefaultInmobiliariaComercialLlm, runInmobiliariaComercialAgentCore } from "./shared";

const AGENT_ID = "inmobiliariacomercial-leadgen";

let inst: InmobiliariaComercialLeadGenAgent | null = null;

export class InmobiliariaComercialLeadGenAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InmobiliariaComercialLeadGenAgent {
    if (!inst) inst = new InmobiliariaComercialLeadGenAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInmobiliariaComercialLlm();
  }

  async run(input: InmobiliariaComercialInput): Promise<InmobiliariaComercialOutput> {
    const eliteRole = "Eres **Inmobiliaria Comercial Lead Gen** — inversores y empresas.";
    const mission =
      "Diseña **captación de inversores y empresas** (ICP B2B, outbound, eventos sector y partnerships).";
    const fewShot =
      '{"result":"Playbook ABM oficinas + naves","score":93,"recommendations":["LinkedIn Sales Nav","Webinar ROI activo"]}';
    return runInmobiliariaComercialAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInmobiliariaComercialLeadGenAgent(): InmobiliariaComercialLeadGenAgent {
  return InmobiliariaComercialLeadGenAgent.instance();
}

export function resetInmobiliariaComercialLeadGenAgentForTests(): void {
  inst = null;
}
