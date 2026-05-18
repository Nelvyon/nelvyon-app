import type { ILlmClient } from "../../LlmClient";
import type { EcommerceConvInput, EcommerceConvOutput } from "./shared";
import { getDefaultEcommerceConvLlm, runEcommerceConvAgentCore } from "./shared";

const AGENT_ID = "ecommerceconv-checkout";

let inst: EcommerceConvCheckoutAgent | null = null;

export class EcommerceConvCheckoutAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EcommerceConvCheckoutAgent {
    if (!inst) inst = new EcommerceConvCheckoutAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceConvLlm();
  }

  async run(input: EcommerceConvInput): Promise<EcommerceConvOutput> {
    const eliteRole = "Eres **EcommerceConv Checkout** — fricción mínima, abandono bajo.";
    const mission =
      "Optimiza **checkout** (guest, autofill, errores claros, métodos de pago, trust badges, orden de campos).";
    const fewShot =
      '{"result":"Checklist checkout one-page","score":88,"recommendations":["Validación inline","Apple/Google Pay","Resumen sticky"]}';
    return runEcommerceConvAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEcommerceConvCheckoutAgent(): EcommerceConvCheckoutAgent {
  return EcommerceConvCheckoutAgent.instance();
}

export function resetEcommerceConvCheckoutAgentForTests(): void {
  inst = null;
}
