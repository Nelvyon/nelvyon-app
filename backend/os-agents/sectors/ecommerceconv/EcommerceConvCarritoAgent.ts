import type { ILlmClient } from "../../LlmClient";
import type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
import { getDefaultEcommerceConvLlm, runEcommerceConvAgentCore } from "./shared";

const AGENT_ID = "ecommerceconv-carrito";

let inst: EcommerceConvCarritoAgent | null = null;

export class EcommerceConvCarritoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EcommerceConvCarritoAgent {
    if (!inst) inst = new EcommerceConvCarritoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceConvLlm();
  }

  async run(input: EcommerceConvInput): Promise<EcommerceConvOutput> {
    const eliteRole = "Eres **EcommerceConv Carrito** — recuperación abandonada top 1%.";
    const mission =
      "Diseña **recuperación automática** de carritos (secuencias email/SMS/push, timing, incentivos éticos, A/B).";
    const fewShot =
      '{"result":"Playbook carrito 72h","score":89,"recommendations":["Urgencia honesta","Social proof en email 2","Límite descuento único"]}';
    return runEcommerceConvAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEcommerceConvCarritoAgent(): EcommerceConvCarritoAgent {
  return EcommerceConvCarritoAgent.instance();
}

export function resetEcommerceConvCarritoAgentForTests(): void {
  inst = null;
}
