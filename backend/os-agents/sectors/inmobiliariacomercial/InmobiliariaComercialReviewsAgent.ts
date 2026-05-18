import type { ILlmClient } from "../../LlmClient";
import type { InmobiliariaComercialInput, InmobiliariaComercialOutput } from "./shared";
import { getDefaultInmobiliariaComercialLlm, runInmobiliariaComercialAgentCore } from "./shared";

const AGENT_ID = "inmobiliariacomercial-reviews";

let inst: InmobiliariaComercialReviewsAgent | null = null;

export class InmobiliariaComercialReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InmobiliariaComercialReviewsAgent {
    if (!inst) inst = new InmobiliariaComercialReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInmobiliariaComercialLlm();
  }

  async run(input: InmobiliariaComercialInput): Promise<InmobiliariaComercialOutput> {
    const eliteRole = "Eres **Inmobiliaria Comercial Reviews** — reputación y casos.";
    const mission =
      "Diseña **reputación de agencia** y **casos de éxito** (testimonios B2B, referencias, prueba social).";
    const fewShot =
      '{"result":"Plantilla caso éxito arrendamiento corporativo","score":90,"recommendations":["Video cliente","Google Business Profile"]}';
    return runInmobiliariaComercialAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInmobiliariaComercialReviewsAgent(): InmobiliariaComercialReviewsAgent {
  return InmobiliariaComercialReviewsAgent.instance();
}

export function resetInmobiliariaComercialReviewsAgentForTests(): void {
  inst = null;
}
